
import { GoogleGenAI, Type } from "@google/genai";
import { GEMINI_MODEL_REASONING, GEMINI_MODEL_IMAGE, VEO_MODEL, SYSTEM_INSTRUCTION_STORYBOARD, SYSTEM_INSTRUCTION_EDL, DEMO_VIDEO_URL, DEFAULT_API_KEY } from "../constants";
import { Scene, StoryboardResponse } from "../types";

// Helper to get a fresh client instance. 
// We prioritizes window.process.env.API_KEY to ensure we get the absolute latest key 
// injected by window.aistudio.openSelectKey.
const getAiClient = () => {
  let key = "";
  
  // 1. Try window.process.env (Runtime Browser Update - user selected key)
  if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
    key = (window as any).process.env.API_KEY;
  } 
  // 2. Try global process.env (Build time / Node)
  else if (typeof process !== 'undefined' && process.env?.API_KEY) {
    key = process.env.API_KEY;
  }

  // 3. Fallback to default if no environment key is found
  if (!key) {
    key = DEFAULT_API_KEY;
  }
  
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Generates a storyboard from a raw script using Gemini 3 Pro.
 */
export const generateStoryboard = async (script: string): Promise<Scene[]> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_REASONING,
      contents: [
        {
          role: 'user',
          parts: [{ text: script }]
        }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_STORYBOARD,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  visual_prompt: { type: Type.STRING },
                  camera_angle: { type: Type.STRING },
                  estimated_duration: { type: Type.INTEGER },
                },
                required: ["description", "visual_prompt", "camera_angle", "estimated_duration"]
              }
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || "{}") as StoryboardResponse;
    
    if (!json.scenes) throw new Error("Invalid response format");

    return json.scenes.map((s, index) => ({
      id: `scene-${Date.now()}-${index}`,
      description: s.description,
      prompt: s.visual_prompt,
      camera: s.camera_angle,
      duration: s.estimated_duration,
      imageStatus: 'idle',
      videoStatus: 'idle'
    }));

  } catch (error) {
    console.error("Storyboard Generation Error:", error);
    throw error;
  }
};

/**
 * Generates a reference image for a scene using Gemini 2.5 Flash Image.
 */
export const generateReferenceImage = async (prompt: string): Promise<string> => {
  try {
    const ai = getAiClient();
    // Adding aesthetic modifiers for "Neon Pineapple" vibe
    const enhancedPrompt = `${prompt}, 电影质感, 8k分辨率, 高细节, 赛博朋克风格, 霓虹配色`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_IMAGE,
      contents: enhancedPrompt,
      config: {
        // gemini-2.5-flash-image does not support imageSize or strict aspect ratio enums in the same way as Pro
      }
    });

    // Extract Base64 from inlineData
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image Gen Error:", error);
    throw error;
  }
};

/**
 * Generates a video using Veo based on a prompt and an optional reference image.
 * Includes retry logic for 404 errors to allow API Key selection.
 * FALLBACKS to a demo video if generation fails to allow flow testing.
 */
export const generateVideoClip = async (
  prompt: string, 
  imageBase64?: string
): Promise<string> => {
  
  // Encapsulate the generation logic to allow retries with a fresh client
  const performGeneration = async (client: GoogleGenAI) => {
    // Veo generation config
    const config = {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    };

    let operation;
    const cleanBase64 = imageBase64 ? imageBase64.split(',')[1] : null;

    if (cleanBase64) {
      operation = await client.models.generateVideos({
        model: VEO_MODEL,
        prompt: prompt,
        image: {
          imageBytes: cleanBase64,
          mimeType: 'image/png', 
        },
        config: config as any
      });
    } else {
      operation = await client.models.generateVideos({
        model: VEO_MODEL,
        prompt: prompt,
        config: config as any
      });
    }

    // Polling loop
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await client.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Video generation failed to return a URI");

    // The URI needs the API key appended to be accessible. 
    // We fetch the key dynamically again to be safe.
    let key = "";
    if (typeof window !== 'undefined' && (window as any).process?.env?.API_KEY) {
      key = (window as any).process.env.API_KEY;
    } else if (process.env.API_KEY) {
      key = process.env.API_KEY;
    } else {
      key = DEFAULT_API_KEY;
    }

    return `${videoUri}&key=${key}`;
  };

  try {
    const ai = getAiClient();
    return await performGeneration(ai);
  } catch (error: any) {
    console.error("Video Gen Error (Attempt 1):", error);
    
    // Check for 404 Not Found, which usually implies missing access/permissions for Veo
    const isNotFound = error.message?.includes("404") || 
                       error.toString().includes("Not Found") || 
                       error.status === 404 ||
                       (error.error && error.error.code === 404);

    if (isNotFound) {
      if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
         console.log("Triggering API Key Selection due to 404...");
         try {
            await (window as any).aistudio.openSelectKey();
            
            // CRITICAL: Re-initialize client AFTER the key selection promise resolves.
            const newAi = getAiClient();
            console.log("Retrying video generation with new key...");
            return await performGeneration(newAi);
         } catch (retryError) {
            console.error("Video Gen Error (Retry Failed):", retryError);
            // Fall through to fallback
         }
      }
    }
    
    // --- FALLBACK LOGIC ---
    // If we reach here, either the retry failed, or it wasn't a 404, or openSelectKey wasn't available.
    // Instead of crashing the app, we return the demo video.
    
    alert("由于 Veo 模型权限限制或网络问题，视频生成失败。\n\n系统已自动切换至【演示模式】(Demo Mode)，将为您展示示例视频以完成测试流程。");
    
    return DEMO_VIDEO_URL;
  }
};

/**
 * Generates an Edit Decision List (EDL) and analysis based on the scene data.
 */
export const generateProjectEDL = async (scenes: Scene[]): Promise<string> => {
  try {
    const ai = getAiClient();
    
    // Construct a textual representation of the sequence
    const sequenceData = scenes.map((s, i) => 
      `SCENE_${i+1}: Duration=${s.duration}s. Description: ${s.description}. Filename=scene_${i+1}.mp4`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_REASONING,
      contents: `Video Sequence Data:\n${sequenceData}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_EDL,
      }
    });

    return response.text || "EDL Generation Failed.";
  } catch (error) {
    console.error("EDL Generation Error:", error);
    throw error;
  }
};

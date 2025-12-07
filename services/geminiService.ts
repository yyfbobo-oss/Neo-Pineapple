
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
 * Generates a storyboard from a raw script using Gemini 2.5 Flash.
 */
export const generateStoryboard = async (script: string): Promise<Scene[]> => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_REASONING,
      // FIX: Use simple object structure for contents to prevent XHR/RPC errors on proxy
      contents: {
        parts: [{ text: script }]
      },
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
    
    // Robust 404/Permission detection
    // Handle: nested error objects, stringified JSON errors, and standard Error messages
    let isNotFound = false;
    try {
      if (error.status === 404) isNotFound = true;
      if (error.error && error.error.code === 404) isNotFound = true;
      if (error.message && (error.message.includes("404") || error.message.includes("Not Found"))) isNotFound = true;
      // Fallback: stringify entire error to catch nested messages
      if (!isNotFound && JSON.stringify(error).includes("Requested entity was not found")) isNotFound = true;
    } catch (e) {
      console.warn("Error parsing exception:", e);
    }

    if (isNotFound) {
       // Manual API Key Entry Logic
       const userKey = window.prompt("【Veo 模型权限检查】\n检测到当前 Key 无法访问视频生成模型 (404 Error)。\n\n请手动输入具有 Veo 权限的 Google Cloud API Key 以继续：");
       
       if (userKey && userKey.trim().length > 0) {
           console.log("Applying user provided key...");
           // 1. Update runtime env
           if (typeof window !== 'undefined') {
              const w = window as any;
              if (!w.process) w.process = {};
              if (!w.process.env) w.process.env = {};
              w.process.env.API_KEY = userKey.trim();
           }

           // 2. Retry
           try {
              const newAi = getAiClient(); // Will pick up the new key
              return await performGeneration(newAi);
           } catch (retryError) {
              console.error("Video Gen Error (Retry Failed):", retryError);
              // Fall through to fallback
           }
       }
    }
    
    // --- FALLBACK LOGIC ---
    // If we reach here, either the retry failed, or it wasn't a 404, or user cancelled input.
    // Instead of crashing the app, we return the demo video.
    
    alert("视频生成遇到问题，将切换至【演示模式】(Demo Mode)。\n\n原因: 权限不足或网络请求失败。");
    
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

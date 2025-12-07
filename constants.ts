
// The hardcoded key provided by the user. 
export const DEFAULT_API_KEY = "AIzaSyCI9EEZJKdgnqqLmzYCgZjY2Rj4kfqmLkI";

// Safe polyfill for window.process to ensure we can read from it later
try {
  if (typeof window !== 'undefined') {
    const w = window as any;
    if (!w.process) {
      w.process = {};
    }
    if (!w.process.env) {
      w.process.env = {};
    }
  }
} catch (e) {
  console.warn("Error polyfilling window.process", e);
}

// We NO LONGER attempt to write DEFAULT_API_KEY into process.env here.
// Doing so causes "TypeError: Cannot assign to read only property" in strict/frozen environments,
// which causes the "Failed to load the app" error.
// Instead, the service layer will handle the fallback.

export const APP_PASSWORD = "nihongboluoup!";

export const GEMINI_MODEL_REASONING = "gemini-2.5-flash";
// Using flash-image to avoid 403 errors on standard keys
export const GEMINI_MODEL_IMAGE = "gemini-2.5-flash-image"; 
export const VEO_MODEL = "veo-3.1-fast-generate-preview";

export const DEMO_VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4";

export const SYSTEM_INSTRUCTION_STORYBOARD = `
你是一位顶级电影分镜师。你的任务是将用户提供的剧本拆解为详细的视频分镜。
请返回 JSON 格式，包含一个数组 "scenes"。

重要原则：为了保持视频的一致性，请在每个分镜的 "visual_prompt" 中重复描述主角的外貌特征（如发色、衣着）和场景的整体基调。不要假设模型记得上一个分镜的内容。

每个 scene 必须包含：
1. "description": 分镜剧情描述 (必须中文)
2. "visual_prompt": 用于生成画面的详细视觉提示词，包含光影、风格、主体。必须包含主角特征的重复描述。(必须中文)
3. "camera_angle": 运镜方式 (必须严格使用中文，例如：推镜头、特写、广角、环绕)
4. "estimated_duration": 预估时长 (秒，整数，通常在 2-5 秒之间)
`;

export const SYSTEM_INSTRUCTION_EDL = `
你是一位专业的后期剪辑助理。请根据提供的视频片段列表，生成一个标准的 CMX 3600 格式的 EDL (Edit Decision List)。

规则：
1. 格式必须严格遵循 CMX 3600 标准。
2. 假设每个素材的帧率是 24fps。
3. 假设 Timeline 起始时间码为 01:00:00:00。
4. 按照场景顺序依次排列 (Cut 剪辑)。
5. Clip Name 使用 SCENE_01, SCENE_02 等格式。
6. 在 EDL 下方，请用中文简要分析一下这组镜头的剪辑节奏和情感色彩。

输入将包含每个场景的 ID, 描述, 和时长。
`;
export enum AppStep {
  AUTH = 'AUTH',
  SCRIPT = 'SCRIPT',
  STORYBOARD = 'STORYBOARD',
  IMAGES = 'IMAGES',
  VIDEO = 'VIDEO',
}

export interface Scene {
  id: string;
  description: string; // The visual description for the model
  prompt: string; // The specific prompt for image generation
  duration: number;
  camera: string;
  referenceImage?: string; // Base64 or URL
  imageStatus?: 'idle' | 'generating' | 'completed' | 'failed';
  videoUrl?: string;
  videoStatus?: 'idle' | 'generating' | 'completed' | 'failed';
}

export interface StoryboardResponse {
  scenes: {
    description: string;
    visual_prompt: string;
    camera_angle: string;
    estimated_duration: number;
  }[];
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';
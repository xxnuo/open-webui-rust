// Kokoro TTS Worker
// This worker handles TTS generation using the Kokoro model

interface InitPayload {
  model_id?: string;
  dtype?: string;
}

interface GeneratePayload {
  text: string;
  voice: string;
}

let tts: any = null;
let isInitialized = false;
const DEFAULT_MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

self.onmessage = async (event: MessageEvent) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    const { model_id, dtype }: InitPayload = payload;
    const modelToUse = model_id || DEFAULT_MODEL_ID;

    self.postMessage({ status: 'init:start' });

    try {
      // Dynamic import of Kokoro TTS
      const { KokoroTTS } = await import('kokoro-js');
      
      // Check for WebGPU support
      const hasWebGPU = typeof navigator !== 'undefined' && !!navigator.gpu;
      
      tts = await KokoroTTS.from_pretrained(modelToUse, {
        dtype: dtype || 'fp32',
        device: hasWebGPU ? 'webgpu' : 'wasm',
      });
      
      isInitialized = true;
      self.postMessage({ status: 'init:complete' });
    } catch (error: any) {
      isInitialized = false;
      self.postMessage({ 
        status: 'init:error', 
        error: error?.message || 'Failed to initialize TTS' 
      });
    }
  } else if (type === 'generate') {
    if (!isInitialized || !tts) {
      self.postMessage({ 
        status: 'generate:error', 
        error: 'TTS model not initialized' 
      });
      return;
    }

    const { text, voice }: GeneratePayload = payload;
    self.postMessage({ status: 'generate:start' });

    try {
      const rawAudio = await tts.generate(text, { voice });
      const blob = await rawAudio.toBlob();
      const blobUrl = URL.createObjectURL(blob);
      self.postMessage({ status: 'generate:complete', audioUrl: blobUrl });
    } catch (error: any) {
      self.postMessage({ 
        status: 'generate:error', 
        error: error?.message || 'Failed to generate audio' 
      });
    }
  } else if (type === 'status') {
    self.postMessage({ 
      status: 'status:check', 
      initialized: isInitialized 
    });
  }
};

export {};


// @ts-ignore - Worker import
import WorkerInstance from './kokoro.worker?worker';

interface GenerateParams {
  text: string;
  voice: string;
}

interface QueuedRequest {
  text: string;
  voice: string;
  resolve: (value: string) => void;
  reject: (reason: any) => void;
}

export class KokoroWorker {
  private worker: Worker | null = null;
  private initialized: boolean = false;
  private dtype: string;
  private requestQueue: QueuedRequest[] = [];
  private processing = false;

  constructor(dtype: string = 'fp32') {
    this.dtype = dtype;
  }

  public async init(): Promise<void> {
    if (this.worker) {
      console.warn('KokoroWorker is already initialized.');
      return;
    }

    this.worker = new WorkerInstance();

    // Handle worker messages
    this.worker.onmessage = (event) => {
      const { status, error, audioUrl } = event.data;

      if (status === 'init:complete') {
        this.initialized = true;
      } else if (status === 'init:error') {
        console.error('Kokoro TTS initialization error:', error);
        this.initialized = false;
      } else if (status === 'generate:complete') {
        const request = this.requestQueue.shift();
        if (request) {
          request.resolve(audioUrl);
          this.processNextRequest();
        }
      } else if (status === 'generate:error') {
        const request = this.requestQueue.shift();
        if (request) {
          request.reject(new Error(error));
          this.processNextRequest();
        }
      }
    };

    return new Promise<void>((resolve, reject) => {
      this.worker!.postMessage({
        type: 'init',
        payload: { dtype: this.dtype },
      });

      const handleMessage = (event: MessageEvent) => {
        if (event.data.status === 'init:complete') {
          this.worker!.removeEventListener('message', handleMessage);
          this.initialized = true;
          resolve();
        } else if (event.data.status === 'init:error') {
          this.worker!.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      this.worker!.addEventListener('message', handleMessage);
    });
  }

  public async generate({ text, voice }: GenerateParams): Promise<string> {
    if (!this.initialized || !this.worker) {
      throw new Error('KokoroTTS Worker is not initialized yet.');
    }

    return new Promise<string>((resolve, reject) => {
      this.requestQueue.push({ text, voice, resolve, reject });
      if (!this.processing) {
        this.processNextRequest();
      }
    });
  }

  private processNextRequest(): void {
    if (this.requestQueue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { text, voice } = this.requestQueue[0];
    this.worker!.postMessage({ type: 'generate', payload: { text, voice } });
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.initialized = false;
      this.requestQueue = [];
      this.processing = false;
    }
  }

  public isReady(): boolean {
    return this.initialized;
  }
}


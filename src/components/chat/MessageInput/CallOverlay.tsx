import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera, Video, VideoOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { synthesizeOpenAISpeech, transcribeAudio } from '@/lib/apis/audio';
import { useStore } from '@/store';

interface CallOverlayProps {
  show: boolean;
  onClose: () => void;
  onSubmitPrompt: (prompt: string, options?: { _raw?: boolean }) => Promise<any>;
  onStopResponse: () => void;
  modelId: string;
  onFilesChange?: (files: any[]) => void;
  eventTarget?: EventTarget;
}

const MIN_DECIBELS = -55;
const SILENCE_DURATION = 2000; // 2 seconds of silence
const VISUALIZER_BUFFER_LENGTH = 300;

export default function CallOverlay({
  show,
  onClose,
  onSubmitPrompt,
  onStopResponse,
  modelId,
  onFilesChange,
  eventTarget
}: CallOverlayProps) {
  const { t } = useTranslation();
  const { models, config, settings } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [camera, setCamera] = useState(false);
  const [chatStreaming, setChatStreaming] = useState(false);
  const [rmsLevel, setRmsLevel] = useState(0);
  const [hasStartedSpeaking, setHasStartedSpeaking] = useState(false);
  
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoInputDeviceId, setSelectedVideoInputDeviceId] = useState<string | null>(null);
  
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioAbortControllerRef = useRef<AbortController>(new AbortController());
  const currentMessageIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Record<string, string[]>>({});
  const finishedMessagesRef = useRef<Record<string, boolean>>({});
  const audioCacheRef = useRef<Map<string, HTMLAudioElement | boolean>>(new Map());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);

  const model = models.find(m => m.id === modelId);

  // Get video input devices
  const getVideoInputDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      
      let allDevices = [...videoDevices];
      if (navigator.mediaDevices.getDisplayMedia) {
        allDevices.push({
          deviceId: 'screen',
          groupId: '',
          kind: 'videoinput',
          label: 'Screen Share',
          toJSON: () => ({})
        } as MediaDeviceInfo);
      }
      
      setVideoInputDevices(allDevices);
      
      if (selectedVideoInputDeviceId === null && allDevices.length > 0) {
        setSelectedVideoInputDeviceId(allDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
    }
  }, [selectedVideoInputDeviceId]);

  // Start video stream
  const startVideoStream = useCallback(async () => {
    if (!videoRef.current) return;
    
    try {
      let stream: MediaStream;
      
      if (selectedVideoInputDeviceId === 'screen') {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' as any },
          audio: false
        });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideoInputDeviceId
            ? { deviceId: { exact: selectedVideoInputDeviceId } }
            : true
        });
      }
      
      cameraStreamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      await getVideoInputDevices();
    } catch (error) {
      console.error('Error starting video stream:', error);
      toast.error(t('Failed to access camera'));
    }
  }, [selectedVideoInputDeviceId, getVideoInputDevices, t]);

  // Stop video stream
  const stopVideoStream = useCallback(async () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  // Take screenshot
  const takeScreenshot = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return null;
    
    const context = canvas.getContext('2d');
    if (!context) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
    
    return canvas.toDataURL('image/png');
  }, []);

  // Start/stop camera
  const startCamera = useCallback(async () => {
    setCamera(true);
    await startVideoStream();
  }, [startVideoStream]);

  const stopCamera = useCallback(async () => {
    await stopVideoStream();
    setCamera(false);
  }, [stopVideoStream]);

  // Calculate RMS level from audio data
  const calculateRMS = (data: Uint8Array): number => {
    let sumSquares = 0;
    for (let i = 0; i < data.length; i++) {
      const normalizedValue = (data[i] - 128) / 128;
      sumSquares += normalizedValue * normalizedValue;
    }
    return Math.sqrt(sumSquares / data.length);
  };

  // Stop all audio playback
  const stopAllAudio = useCallback(async () => {
    setAssistantSpeaking(false);
    
    if (chatStreaming) {
      onStopResponse();
    }
    
    if (currentUtteranceRef.current) {
      speechSynthesis.cancel();
      currentUtteranceRef.current = null;
    }
    
    if (audioElementRef.current) {
      audioElementRef.current.muted = true;
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
  }, [chatStreaming, onStopResponse]);

  // Transcribe audio
  const transcribeHandler = useCallback(async (audioBlob: Blob) => {
    const file = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
    
    try {
      const res = await transcribeAudio(
        localStorage.token,
        file,
        settings?.audio?.stt?.language
      );
      
      if (res && res.text !== '') {
        await onSubmitPrompt(res.text, { _raw: true });
      }
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error(t('Transcription failed'));
    }
  }, [onSubmitPrompt, settings, t]);

  // Stop recording callback
  const stopRecordingCallback = useCallback(async (_continue = true) => {
    if (!show) {
      audioChunksRef.current = [];
      mediaRecorderRef.current = null;
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      return;
    }
    
    const _audioChunks = [...audioChunksRef.current];
    audioChunksRef.current = [];
    mediaRecorderRef.current = null;
    
    if (_continue) {
      startRecording();
    }
    
    if (confirmed && _audioChunks.length > 0) {
      setLoading(true);
      
      if (cameraStreamRef.current) {
        const imageUrl = takeScreenshot();
        if (imageUrl && onFilesChange) {
          onFilesChange([{ type: 'image', url: imageUrl }]);
        }
      }
      
      const audioBlob = new Blob(_audioChunks, { type: 'audio/wav' });
      await transcribeHandler(audioBlob);
      
      setConfirmed(false);
      setLoading(false);
    }
  }, [show, confirmed, takeScreenshot, transcribeHandler, onFilesChange]);

  // Analyze audio for voice activity detection
  const analyseAudio = useCallback((stream: MediaStream) => {
    const audioContext = new AudioContext();
    const audioStreamSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.minDecibels = MIN_DECIBELS;
    audioStreamSource.connect(analyser);
    
    const bufferLength = analyser.frequencyBinCount;
    const domainData = new Uint8Array(bufferLength);
    const timeDomainData = new Uint8Array(analyser.fftSize);
    
    let lastSoundTime = Date.now();
    setHasStartedSpeaking(false);
    
    const processFrame = () => {
      if (!mediaRecorderRef.current || !show) {
        return;
      }
      
      if (assistantSpeaking && !(settings?.voiceInterruption ?? false)) {
        analyser.maxDecibels = 0;
        analyser.minDecibels = -1;
      } else {
        analyser.minDecibels = MIN_DECIBELS;
        analyser.maxDecibels = -30;
      }
      
      analyser.getByteTimeDomainData(timeDomainData);
      analyser.getByteFrequencyData(domainData);
      
      const rms = calculateRMS(timeDomainData);
      setRmsLevel(rms);
      
      const hasSound = domainData.some((value) => value > 0);
      
      if (hasSound) {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'recording') {
          mediaRecorderRef.current.start();
        }
        
        if (!hasStartedSpeaking) {
          setHasStartedSpeaking(true);
          stopAllAudio();
        }
        
        lastSoundTime = Date.now();
      }
      
      if (hasStartedSpeaking && Date.now() - lastSoundTime > SILENCE_DURATION) {
        setConfirmed(true);
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          return;
        }
      }
      
      requestAnimationFrame(processFrame);
    };
    
    requestAnimationFrame(processFrame);
  }, [show, assistantSpeaking, hasStartedSpeaking, stopAllAudio, settings]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!show) return;
    
    try {
      if (!audioStreamRef.current) {
        audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
      }
      
      const recorder = new MediaRecorder(audioStreamRef.current);
      mediaRecorderRef.current = recorder;
      
      recorder.onstart = () => {
        audioChunksRef.current = [];
      };
      
      recorder.ondataavailable = (event) => {
        if (hasStartedSpeaking) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        stopRecordingCallback();
      };
      
      analyseAudio(audioStreamRef.current);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error(t('Failed to access microphone'));
    }
  }, [show, hasStartedSpeaking, stopRecordingCallback, analyseAudio, t]);

  // Speak using SpeechSynthesis
  const speakSpeechSynthesis = useCallback((content: string): Promise<void> => {
    if (!show) return Promise.resolve();
    
    return new Promise((resolve) => {
      const checkVoices = setInterval(async () => {
        const voices = speechSynthesis.getVoices();
        
        if (voices.length > 0) {
          clearInterval(checkVoices);
          
          const voice = voices.find(
            (v) => v.voiceURI === (settings?.audio?.tts?.voice ?? config?.audio?.tts?.voice)
          );
          
          const utterance = new SpeechSynthesisUtterance(content);
          utterance.rate = settings?.audio?.tts?.playbackRate ?? 1;
          
          if (voice) {
            utterance.voice = voice;
          }
          
          currentUtteranceRef.current = utterance;
          speechSynthesis.speak(utterance);
          
          utterance.onend = async () => {
            await new Promise((r) => setTimeout(r, 200));
            resolve();
          };
        }
      }, 100);
    });
  }, [show, settings, config]);

  // Play audio element
  const playAudio = useCallback((audio: HTMLAudioElement): Promise<void> => {
    if (!show) return Promise.resolve();
    
    return new Promise((resolve) => {
      const audioElement = audioElementRef.current;
      
      if (audioElement) {
        audioElement.src = audio.src;
        audioElement.muted = true;
        audioElement.playbackRate = settings?.audio?.tts?.playbackRate ?? 1;
        
        audioElement.play()
          .then(() => {
            audioElement.muted = false;
          })
          .catch((error) => {
            console.error('Error playing audio:', error);
          });
        
        audioElement.onended = async () => {
          await new Promise((r) => setTimeout(r, 100));
          resolve();
        };
      } else {
        resolve();
      }
    });
  }, [show, settings]);

  // Fetch audio for TTS
  const fetchAudio = useCallback(async (content: string) => {
    if (audioCacheRef.current.has(content)) {
      return audioCacheRef.current.get(content);
    }
    
    try {
      if (config?.audio?.tts?.engine !== '') {
        const res = await synthesizeOpenAISpeech(
          localStorage.token,
          settings?.audio?.tts?.voice ?? config?.audio?.tts?.voice,
          content
        );
        
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const audio = new Audio(blobUrl);
        audioCacheRef.current.set(content, audio);
        return audio;
      } else {
        audioCacheRef.current.set(content, true);
        return true;
      }
    } catch (error) {
      console.error('Error fetching audio:', error);
      return null;
    }
  }, [config, settings]);

  // Monitor and play audio queue
  const monitorAndPlayAudio = useCallback(async (id: string, signal: AbortSignal) => {
    while (!signal.aborted) {
      const messages = messagesRef.current[id];
      
      if (messages && messages.length > 0) {
        const content = messages.shift()!;
        
        if (audioCacheRef.current.has(content)) {
          try {
            if (config?.audio?.tts?.engine !== '') {
              const audio = audioCacheRef.current.get(content);
              if (audio && audio instanceof HTMLAudioElement) {
                await playAudio(audio);
              }
            } else {
              await speakSpeechSynthesis(content);
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            console.error('Error playing audio:', error);
          }
        } else {
          messages.unshift(content);
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } else if (finishedMessagesRef.current[id] && (!messages || messages.length === 0)) {
        setAssistantSpeaking(false);
        break;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  }, [config, playAudio, speakSpeechSynthesis]);

  // Event handlers for chat events
  useEffect(() => {
    if (!eventTarget) return;
    
    const handleChatStart = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      setChatStreaming(true);
      
      if (currentMessageIdRef.current !== id) {
        currentMessageIdRef.current = id;
        
        if (audioAbortControllerRef.current) {
          audioAbortControllerRef.current.abort();
        }
        
        audioAbortControllerRef.current = new AbortController();
        setAssistantSpeaking(true);
        monitorAndPlayAudio(id, audioAbortControllerRef.current.signal);
      }
    };
    
    const handleChat = (e: Event) => {
      const { id, content } = (e as CustomEvent).detail;
      
      if (currentMessageIdRef.current === id) {
        if (!messagesRef.current[id]) {
          messagesRef.current[id] = [];
        }
        messagesRef.current[id].push(content);
        fetchAudio(content);
      }
    };
    
    const handleChatFinish = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      finishedMessagesRef.current[id] = true;
      setChatStreaming(false);
    };
    
    eventTarget.addEventListener('chat:start', handleChatStart);
    eventTarget.addEventListener('chat', handleChat);
    eventTarget.addEventListener('chat:finish', handleChatFinish);
    
    return () => {
      eventTarget.removeEventListener('chat:start', handleChatStart);
      eventTarget.removeEventListener('chat', handleChat);
      eventTarget.removeEventListener('chat:finish', handleChatFinish);
    };
  }, [eventTarget, monitorAndPlayAudio, fetchAudio]);

  // Initialize and cleanup
  useEffect(() => {
    if (!show) return;
    
    const initWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) {
          console.error('Wake lock error:', err);
        }
      }
    };
    
    initWakeLock();
    startRecording();
    
    return () => {
      stopAllAudio();
      stopRecordingCallback(false);
      stopCamera();
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
        audioStreamRef.current = null;
      }
      
      audioAbortControllerRef.current.abort();
      
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [show, startRecording, stopAllAudio, stopRecordingCallback, stopCamera]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center p-3 md:p-6">
      <div className="max-w-lg w-full h-full max-h-[100dvh] flex flex-col justify-between">
        {/* Top section */}
        {camera && (
          <button
            type="button"
            className="flex justify-center items-center w-full h-20 min-h-20"
            onClick={() => {
              if (assistantSpeaking) {
                stopAllAudio();
              }
            }}
          >
            {loading || assistantSpeaking ? (
              <div className="size-12 flex items-center justify-center">
                <div className="animate-bounce">●</div>
              </div>
            ) : (
              <div
                className={`transition-all rounded-full ${
                  rmsLevel * 100 > 4
                    ? 'size-[4.5rem]'
                    : rmsLevel * 100 > 2
                    ? 'size-16'
                    : rmsLevel * 100 > 1
                    ? 'size-14'
                    : 'size-12'
                } ${
                  model?.info?.meta?.profile_image_url
                    ? 'bg-cover bg-center bg-no-repeat'
                    : 'bg-black dark:bg-white'
                }`}
                style={
                  model?.info?.meta?.profile_image_url
                    ? { backgroundImage: `url('${model.info.meta.profile_image_url}')` }
                    : undefined
                }
              />
            )}
          </button>
        )}

        {/* Main content area */}
        <div className="flex justify-center items-center flex-1 h-full w-full max-h-full">
          {!camera ? (
            <button
              type="button"
              onClick={() => {
                if (assistantSpeaking) {
                  stopAllAudio();
                }
              }}
            >
              {loading || assistantSpeaking ? (
                <div className="size-44 flex items-center justify-center">
                  <div className="animate-bounce text-6xl">●</div>
                </div>
              ) : (
                <div
                  className={`transition-all rounded-full ${
                    rmsLevel * 100 > 4
                      ? 'size-52'
                      : rmsLevel * 100 > 2
                      ? 'size-48'
                      : rmsLevel * 100 > 1
                      ? 'size-44'
                      : 'size-40'
                  } ${
                    model?.info?.meta?.profile_image_url
                      ? 'bg-cover bg-center bg-no-repeat'
                      : 'bg-black dark:bg-white'
                  }`}
                  style={
                    model?.info?.meta?.profile_image_url
                      ? { backgroundImage: `url('${model.info.meta.profile_image_url}')` }
                      : undefined
                  }
                />
              )}
            </button>
          ) : (
            <div className="relative flex w-full max-h-full pt-2 pb-4 md:py-6 px-2 h-full">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="rounded-2xl h-full min-w-full object-cover object-center"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute top-4 md:top-8 left-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="backdrop-blur-xl bg-black/10 text-white rounded-full"
                  onClick={stopCamera}
                >
                  <X className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="flex justify-between items-center pb-2 w-full">
          <div>
            {!camera && (
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-secondary"
                onClick={startCamera}
              >
                <Camera className="h-5 w-5" />
              </Button>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                if (assistantSpeaking) {
                  stopAllAudio();
                }
              }}
            >
              <div className="line-clamp-1 text-sm font-medium">
                {loading
                  ? t('Thinking...')
                  : assistantSpeaking
                  ? t('Tap to interrupt')
                  : t('Listening...')}
              </div>
            </button>
          </div>

          <div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-secondary"
              onClick={async () => {
                await stopCamera();
                if (audioStreamRef.current) {
                  audioStreamRef.current.getTracks().forEach((track) => track.stop());
                }
                onClose();
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Hidden audio element for playback */}
      <audio ref={audioElementRef} className="hidden" />
    </div>
  );
}


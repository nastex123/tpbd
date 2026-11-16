import { useState, useRef, useEffect, useCallback } from 'react';
import { localApiFetch } from '../globe/localApi.ts';

/**
 * Converts a Base64-encoded audio payload into a binary Blob.
 */
export function base64ToBlob(base64: string, mimeType = 'audio/wav'): Blob {
  const atobFn = typeof atob === 'function' ? atob : (str: string) => Buffer.from(str, 'base64').toString('binary');
  const binaryString = atobFn(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export function useDynamicAudioBrief() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return cleanupAudio;
  }, [cleanupAudio]);

  const playSpeech = useCallback(
    async (text: string, voice = 'Puck') => {
      cleanupAudio();
      setIsGenerating(true);
      setError(null);

      try {
        const response = await localApiFetch('/api/v1/ai/audio-brief', {
          method: 'POST',
          body: JSON.stringify({ text, voice, model: 'auto' }),
        });

        if (!response.ok) {
          const errorJson = await response.json().catch(() => null);
          const detail = errorJson?.detail || `Audio synthesis failed (HTTP ${response.status})`;
          throw new Error(detail);
        }

        const payload = (await response.json()) as { audio_base64?: string; mime_type?: string };
        if (!payload.audio_base64) {
          throw new Error('No audio data received from Gemini TTS.');
        }

        const blob = base64ToBlob(payload.audio_base64, payload.mime_type || 'audio/wav');
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setIsPlaying(false);
        };
        audio.onerror = () => {
          setError('Audio playback error occurred.');
          setIsPlaying(false);
        };

        await audio.play();
        setIsPlaying(true);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to synthesize audio brief.';
        setError(message);
        setIsPlaying(false);
      } finally {
        setIsGenerating(false);
      }
    },
    [cleanupAudio]
  );

  const stopSpeech = useCallback(() => {
    cleanupAudio();
  }, [cleanupAudio]);

  return {
    playSpeech,
    stopSpeech,
    isPlaying,
    isGenerating,
    error,
  };
}

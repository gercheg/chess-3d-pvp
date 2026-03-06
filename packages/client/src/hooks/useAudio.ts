import { useRef, useCallback, useEffect } from "react";

type SoundName =
  | "check"
  | "checkmate"
  | "your-turn"
  | "game-over"
  | "welcome"
  | "victory"
  | "defeat";

const BASE = "/assets/audio/";

const cache = new Map<string, HTMLAudioElement>();

function getAudio(name: string): HTMLAudioElement {
  const cached = cache.get(name);
  if (cached) return cached;
  const el = new Audio(`${BASE}${name}.mp3`);
  el.preload = "auto";
  cache.set(name, el);
  return el;
}

export function useAudio() {
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((name: SoundName) => {
    const audio = getAudio(name);
    audio.currentTime = 0;
    audio.volume = 0.7;
    audio.play().catch(() => {});
  }, []);

  const startBgm = useCallback(() => {
    if (!bgmRef.current) {
      bgmRef.current = new Audio(`${BASE}chess-bgm.mp3`);
      bgmRef.current.loop = true;
      bgmRef.current.volume = 0.15;
    }
    bgmRef.current.play().catch(() => {});
  }, []);

  const stopBgm = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    return () => {
      bgmRef.current?.pause();
    };
  }, []);

  return { play, startBgm, stopBgm };
}

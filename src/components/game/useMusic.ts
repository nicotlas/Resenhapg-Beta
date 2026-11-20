import { useEffect, useRef, useState } from "react";

const VOLUME_KEY = "resenhapg-volume";

/** Game volume 0..1, remembered in this browser. */
export function useVolume() {
  const [volume, setVolume] = useState(0.5);
  useEffect(() => {
    const v = Number(window.localStorage.getItem(VOLUME_KEY));
    if (window.localStorage.getItem(VOLUME_KEY) !== null && Number.isFinite(v)) setVolume(Math.max(0, Math.min(1, v)));
  }, []);
  const change = (v: number) => {
    setVolume(v);
    try {
      window.localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      // storage blocked: the volume still applies for this visit
    }
  };
  return [volume, change] as const;
}

/**
 * Plays one looping background track at a time; `src = null` means silence.
 * Browsers block audio until the player touches/clicks/presses a key, so a
 * blocked start is retried on the first interaction.
 */
export function useMusic(src: string | null, volume = 0.5) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const volRef = useRef(volume);
  volRef.current = volume;

  useEffect(() => {
    if (!src) return;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volRef.current;
    audioRef.current = audio;

    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const retry = () => {
      audio.play().then(removeRetry).catch(() => {});
    };
    const removeRetry = () => events.forEach((e) => window.removeEventListener(e, retry));

    audio.play().catch(() => events.forEach((e) => window.addEventListener(e, retry)));

    return () => {
      removeRetry();
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, [src]);

  // changing the volume must not restart the song
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);
}

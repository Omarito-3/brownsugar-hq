"use client";

import { useCallback } from "react";
import { useSoundSettings } from "@/components/providers/sound-provider";

export function useSound(name: string, volume = 0.6) {
  const { muted } = useSoundSettings();

  const play = useCallback(() => {
    if (muted) return;
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = volume;
    audio.play().catch(() => {
      // Playback can be blocked (no file yet, or autoplay policy) - fail silently.
    });
  }, [muted, name, volume]);

  return play;
}

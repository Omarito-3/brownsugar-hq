"use client";

import { Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSoundSettings } from "@/components/providers/sound-provider";

export function SoundToggle() {
  const { muted, toggleMuted } = useSoundSettings();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={muted ? "Unmute sounds" : "Mute sounds"}
      onClick={toggleMuted}
    >
      {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
    </Button>
  );
}

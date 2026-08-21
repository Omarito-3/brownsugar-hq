"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "bshq-sound-muted";

type SoundContextValue = {
  muted: boolean;
  toggleMuted: () => void;
  setMuted: (muted: boolean) => void;
};

const SoundContext = createContext<SoundContextValue | undefined>(undefined);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    // Reading a browser-only API (localStorage) can't happen during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== null) setMutedState(stored === "true");
  }, []);

  const setMuted = (value: boolean) => {
    setMutedState(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  };

  const toggleMuted = () => setMuted(!muted);

  return (
    <SoundContext.Provider value={{ muted, toggleMuted, setMuted }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundSettings() {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSoundSettings must be used within a SoundProvider");
  return ctx;
}

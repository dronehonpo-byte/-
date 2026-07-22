"use client";
/**
 * TTS 再生フック。
 *
 * `lib/platform` の speech サービスと voiceStore の TTS 設定を束ねる。
 * UI からは直接 speechSynthesis を触らず、このフック経由で読み上げる。
 */
import { useCallback, useEffect, useState } from "react";
import { speech } from "@/lib/platform";
import { useVoiceStore } from "@/stores/voiceStore";

export function useSpeak() {
  const tts = useVoiceStore((s) => s.tts);
  const [speaking, setSpeaking] = useState(false);
  const supported = speech.isSupported();

  const speak = useCallback(
    async (text: string) => {
      setSpeaking(true);
      try {
        await speech.speak(text, { rate: tts.rate, volume: tts.volume });
      } finally {
        setSpeaking(false);
      }
    },
    [tts.rate, tts.volume],
  );

  const stop = useCallback(() => {
    speech.stop();
    setSpeaking(false);
  }, []);

  // アンマウント時に読み上げを止める
  useEffect(() => () => speech.stop(), []);

  return { speak, stop, speaking, supported };
}

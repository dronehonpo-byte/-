/**
 * Web 実装: Web Speech API (SpeechSynthesis) による TTS。
 *
 * RN/Expo 移行時はこのファイルを置き換える（expo-speech 等）。
 * UI からは直接 `window.speechSynthesis` を呼ばず、必ずこの層を経由する。
 */
import type { SpeechService, SpeakOptions } from "./speech";

const DEFAULT_RATE = 0.85; // 遅め
const DEFAULT_VOLUME = 1.0; // 大きめ

/** 日本語音声を優先的に選ぶ */
function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const ja =
    voices.find((v) => v.lang === "ja-JP") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("ja"));
  return ja ?? null;
}

class WebSpeechService implements SpeechService {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof window.speechSynthesis !== "undefined"
    );
  }

  speak(text: string, options?: SpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported() || !text.trim()) {
        resolve();
        return;
      }
      // 既存の読み上げを中断してから開始（重複防止）
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ja-JP";
      utterance.rate = options?.rate ?? DEFAULT_RATE;
      utterance.volume = options?.volume ?? DEFAULT_VOLUME;

      const voice = pickJapaneseVoice();
      if (voice) utterance.voice = voice;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}

export const webSpeechService: SpeechService = new WebSpeechService();

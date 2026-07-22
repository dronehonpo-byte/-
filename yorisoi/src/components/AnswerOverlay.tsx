"use client";
/**
 * 回答表示オーバーレイ。
 * ボタンをタップすると画面中央に大きな文字で回答を表示し、TTS を再生する。
 * 「もう一度」で再読み上げ、「とじる」で閉じる。
 */
import { Volume2, X, RotateCcw } from "lucide-react";
import { resolveIcon } from "@/lib/icons";
import type { IconKey } from "@/types/voice";
import styles from "./AnswerOverlay.module.css";

interface AnswerOverlayProps {
  title: string;
  answer: string;
  icon: IconKey;
  speaking: boolean;
  onReplay: () => void;
  onClose: () => void;
}

export function AnswerOverlay({
  title,
  answer,
  icon,
  speaking,
  onReplay,
  onClose,
}: AnswerOverlayProps) {
  const Icon = resolveIcon(icon);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.iconWrap} aria-hidden>
            <Icon size={48} strokeWidth={2} />
          </span>
          <h2 className={styles.title}>{title}</h2>
        </div>

        <p className={styles.answer}>{answer}</p>

        {speaking && (
          <p className={styles.speaking} aria-live="polite">
            <Volume2 size={28} /> 読み上げています…
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.replay} onClick={onReplay}>
            <RotateCcw size={32} />
            もう一度
          </button>
          <button type="button" className={styles.close} onClick={onClose}>
            <X size={32} />
            とじる
          </button>
        </div>
      </div>
    </div>
  );
}

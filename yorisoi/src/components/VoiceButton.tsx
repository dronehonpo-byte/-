"use client";
/**
 * 大ボタン: アイコン（大）＋見出し文字（大）＋任意の写真。
 * タップで読み上げ＆回答表示（呼び出し側が onSpeak で制御）。
 */
import Image from "next/image";
import { resolveIcon } from "@/lib/icons";
import type { VoiceButton as VoiceButtonModel } from "@/types/voice";
import styles from "./VoiceButton.module.css";

interface VoiceButtonProps {
  button: VoiceButtonModel;
  onActivate: (button: VoiceButtonModel) => void;
}

export function VoiceButton({ button, onActivate }: VoiceButtonProps) {
  const Icon = resolveIcon(button.icon);

  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => onActivate(button)}
      aria-label={`${button.title}。読み上げます`}
    >
      {button.photo ? (
        <span className={styles.photoWrap}>
          <Image
            src={button.photo}
            alt=""
            fill
            sizes="120px"
            className={styles.photo}
            unoptimized
          />
        </span>
      ) : (
        <span className={styles.iconWrap} aria-hidden>
          <Icon size={72} strokeWidth={2} />
        </span>
      )}
      <span className={styles.title}>{button.title}</span>
    </button>
  );
}

"use client";
/**
 * 本人モード カテゴリ子画面（機能①）。
 * カテゴリ内の音声ボタン一覧。タップで TTS 再生＋回答オーバーレイ。
 */
import { use, useState, useCallback } from "react";
import { notFound } from "next/navigation";
import { VoiceButton } from "@/components/VoiceButton";
import { AnswerOverlay } from "@/components/AnswerOverlay";
import { BackButton } from "@/components/BackButton";
import { useVoiceButtons } from "@/hooks/useVoiceButtons";
import { useSpeak } from "@/hooks/useSpeak";
import { useHydrated } from "@/hooks/useHydrated";
import { resolveAnswer } from "@/lib/answerTemplate";
import type { VoiceButton as VoiceButtonModel } from "@/types/voice";
import styles from "../../senior.module.css";

export default function CategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getCategory, buttonsOf } = useVoiceButtons();
  const { speak, stop, speaking } = useSpeak();
  const hydrated = useHydrated();

  const [active, setActive] = useState<VoiceButtonModel | null>(null);

  const category = getCategory(id);
  const buttons = buttonsOf(id);

  const activate = useCallback(
    (button: VoiceButtonModel) => {
      const text = resolveAnswer(button.answer);
      setActive(button);
      void speak(text);
    },
    [speak],
  );

  const replay = useCallback(() => {
    if (active) void speak(resolveAnswer(active.answer));
  }, [active, speak]);

  const close = useCallback(() => {
    stop();
    setActive(null);
  }, [stop]);

  // ハイドレーション後にカテゴリが見つからなければ 404
  if (hydrated && !category) {
    notFound();
  }

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>{category?.title ?? "…"}</h1>
      </div>

      {!hydrated ? (
        <p className={styles.loading}>よみこみ中…</p>
      ) : buttons.length === 0 ? (
        <p className={styles.empty}>
          まだ ボタンが ありません。
          <br />
          ご家族が「設定」から とうろく できます。
        </p>
      ) : (
        <div className={styles.buttonGrid}>
          {buttons.map((button) => (
            <VoiceButton key={button.id} button={button} onActivate={activate} />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <BackButton href="/senior" label="もどる" />
      </div>

      {active && (
        <AnswerOverlay
          title={active.title}
          answer={resolveAnswer(active.answer)}
          icon={active.icon}
          speaking={speaking}
          onReplay={replay}
          onClose={close}
        />
      )}
    </main>
  );
}

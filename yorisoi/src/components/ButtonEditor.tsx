"use client";
/**
 * 音声ボタンの追加・編集フォーム（設定画面のモーダル）。
 */
import { useState } from "react";
import { X } from "lucide-react";
import { IconPicker } from "./IconPicker";
import { PhotoInput } from "./PhotoInput";
import { hasPlaceholder } from "@/lib/answerTemplate";
import type { IconKey, VoiceButton, VoiceButtonDraft } from "@/types/voice";
import type { VoiceCategory } from "@/types/voice";
import styles from "./ButtonEditor.module.css";

interface ButtonEditorProps {
  /** 編集対象。null なら新規追加 */
  initial: VoiceButton | null;
  /** 追加時の所属カテゴリ（初期選択） */
  defaultCategoryId: string;
  categories: VoiceCategory[];
  onSave: (draft: VoiceButtonDraft) => void;
  onCancel: () => void;
}

export function ButtonEditor({
  initial,
  defaultCategoryId,
  categories,
  onSave,
  onCancel,
}: ButtonEditorProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [icon, setIcon] = useState<IconKey>(initial?.icon ?? "help-circle");
  const [photo, setPhoto] = useState<string | undefined>(initial?.photo);
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? defaultCategoryId,
  );

  const canSave = title.trim().length > 0 && answer.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      answer: answer.trim(),
      icon,
      photo,
      categoryId,
    });
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.card}>
        <div className={styles.head}>
          <h2 className={styles.heading}>
            {initial ? "ボタンを編集" : "ボタンを追加"}
          </h2>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="閉じる"
            onClick={onCancel}
          >
            <X size={24} />
          </button>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>見出し（大きく表示）</span>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 今日の予定"
            maxLength={20}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>回答（読み上げる文）</span>
          <textarea
            className={styles.textarea}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="例: 今日は 10時に 病院です。"
            rows={3}
          />
          <span className={styles.hint}>
            {"{曜日}"} {"{日付}"} {"{年月日}"} と書くと、今日の日付に置き換わります。
            {hasPlaceholder(answer) && (
              <strong className={styles.hintOn}>（日付の自動表示：ON）</strong>
            )}
          </span>
        </label>

        <div className={styles.field}>
          <span className={styles.label}>カテゴリ</span>
          <select
            className={styles.input}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>アイコン</span>
          <IconPicker value={icon} onChange={setIcon} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>写真（任意）</span>
          <PhotoInput value={photo} onChange={setPhoto} />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            キャンセル
          </button>
          <button
            type="button"
            className={styles.save}
            onClick={submit}
            disabled={!canSave}
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
/**
 * 登録・編集画面（機能①）。
 * 家族が本人端末で直接編集する想定（遠隔同期なし）。
 *  - TTS 設定（音量・話速・テスト再生）
 *  - カテゴリ作成・並び替え・名称変更・削除
 *  - ボタン追加・編集・並び替え・削除（アイコン／写真つき）
 *  - 初期テンプレートに戻す
 */
import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Volume2,
  RotateCcw,
} from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { ButtonEditor } from "@/components/ButtonEditor";
import { IconPicker } from "@/components/IconPicker";
import { resolveIcon } from "@/lib/icons";
import { useVoiceButtons } from "@/hooks/useVoiceButtons";
import { useSpeak } from "@/hooks/useSpeak";
import { useHydrated } from "@/hooks/useHydrated";
import { useVoiceStore } from "@/stores/voiceStore";
import { resolveAnswer } from "@/lib/answerTemplate";
import type { IconKey, VoiceButton, VoiceButtonDraft } from "@/types/voice";
import styles from "./settings.module.css";

type EditorState =
  | { mode: "closed" }
  | { mode: "add"; categoryId: string }
  | { mode: "edit"; button: VoiceButton };

export default function SettingsPage() {
  const hydrated = useHydrated();
  const {
    categories,
    buttonsOf,
    addButton,
    updateButton,
    removeButton,
    moveButton,
    addCategory,
    updateCategory,
    removeCategory,
    moveCategory,
    resetToTemplate,
  } = useVoiceButtons();

  const tts = useVoiceStore((s) => s.tts);
  const setTts = useVoiceStore((s) => s.setTts);
  const { speak } = useSpeak();

  const [editor, setEditor] = useState<EditorState>({ mode: "closed" });
  const [newCatTitle, setNewCatTitle] = useState("");
  const [newCatIcon, setNewCatIcon] = useState<IconKey>("help-circle");
  const [showCatIcon, setShowCatIcon] = useState(false);

  const handleSaveButton = (draft: VoiceButtonDraft) => {
    if (editor.mode === "edit") {
      updateButton(editor.button.id, draft);
    } else if (editor.mode === "add") {
      addButton(draft);
    }
    setEditor({ mode: "closed" });
  };

  const handleAddCategory = () => {
    const title = newCatTitle.trim();
    if (!title) return;
    addCategory({ title, icon: newCatIcon });
    setNewCatTitle("");
    setNewCatIcon("help-circle");
    setShowCatIcon(false);
  };

  if (!hydrated) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>設定</h1>
        <p className={styles.loading}>よみこみ中…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>設定（ご家族が編集）</h1>
      <p className={styles.desc}>
        この端末の中だけに保存されます。追加・編集・削除は自由にできます。
      </p>

      {/* ---------- TTS 設定 ---------- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>読み上げの設定</h2>

        <div className={styles.sliderRow}>
          <label htmlFor="rate" className={styles.sliderLabel}>
            話す速さ: <strong>{tts.rate.toFixed(2)}</strong>
            <span className={styles.sliderHint}>（小さいほど ゆっくり）</span>
          </label>
          <input
            id="rate"
            type="range"
            min={0.5}
            max={1.2}
            step={0.05}
            value={tts.rate}
            onChange={(e) => setTts({ rate: Number(e.target.value) })}
            className={styles.slider}
          />
        </div>

        <div className={styles.sliderRow}>
          <label htmlFor="volume" className={styles.sliderLabel}>
            音量: <strong>{Math.round(tts.volume * 100)}%</strong>
          </label>
          <input
            id="volume"
            type="range"
            min={0.2}
            max={1}
            step={0.05}
            value={tts.volume}
            onChange={(e) => setTts({ volume: Number(e.target.value) })}
            className={styles.slider}
          />
        </div>

        <button
          type="button"
          className={styles.testBtn}
          onClick={() => void speak("これは 読み上げの テストです。")}
        >
          <Volume2 size={24} /> テスト再生
        </button>
      </section>

      {/* ---------- カテゴリ管理 ---------- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>カテゴリ</h2>

        <ul className={styles.list}>
          {categories.map((cat, idx) => {
            const Icon = resolveIcon(cat.icon);
            return (
              <li key={cat.id} className={styles.catRow}>
                <span className={styles.catIcon} aria-hidden>
                  <Icon size={28} />
                </span>
                <input
                  className={styles.inlineInput}
                  value={cat.title}
                  onChange={(e) =>
                    updateCategory(cat.id, { title: e.target.value })
                  }
                  aria-label="カテゴリ名"
                />
                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="上へ"
                    disabled={idx === 0}
                    onClick={() => moveCategory(cat.id, "up")}
                  >
                    <ArrowUp size={22} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="下へ"
                    disabled={idx === categories.length - 1}
                    onClick={() => moveCategory(cat.id, "down")}
                  >
                    <ArrowDown size={22} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.danger}`}
                    aria-label="カテゴリを削除"
                    onClick={() => {
                      if (
                        confirm(
                          `「${cat.title}」と、その中のボタンをすべて削除します。よろしいですか？`,
                        )
                      ) {
                        removeCategory(cat.id);
                      }
                    }}
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={styles.addCat}>
          <div className={styles.addCatTop}>
            <input
              className={styles.inlineInput}
              value={newCatTitle}
              onChange={(e) => setNewCatTitle(e.target.value)}
              placeholder="新しいカテゴリ名"
              maxLength={16}
            />
            <button
              type="button"
              className={styles.iconChoose}
              onClick={() => setShowCatIcon((v) => !v)}
            >
              アイコン
            </button>
            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAddCategory}
              disabled={!newCatTitle.trim()}
            >
              <Plus size={22} /> 追加
            </button>
          </div>
          {showCatIcon && (
            <div className={styles.catIconPicker}>
              <IconPicker value={newCatIcon} onChange={setNewCatIcon} />
            </div>
          )}
        </div>
      </section>

      {/* ---------- ボタン管理（カテゴリごと） ---------- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>ボタン</h2>

        {categories.map((cat) => {
          const buttons = buttonsOf(cat.id);
          return (
            <div key={cat.id} className={styles.catBlock}>
              <div className={styles.catBlockHead}>
                <h3 className={styles.catBlockTitle}>{cat.title}</h3>
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => setEditor({ mode: "add", categoryId: cat.id })}
                >
                  <Plus size={22} /> ボタン追加
                </button>
              </div>

              {buttons.length === 0 ? (
                <p className={styles.emptyHint}>まだ ボタンが ありません。</p>
              ) : (
                <ul className={styles.list}>
                  {buttons.map((b, idx) => {
                    const Icon = resolveIcon(b.icon);
                    return (
                      <li key={b.id} className={styles.btnRow}>
                        <span className={styles.btnIcon} aria-hidden>
                          <Icon size={26} />
                        </span>
                        <div className={styles.btnText}>
                          <span className={styles.btnTitle}>{b.title}</span>
                          <span className={styles.btnAnswer}>
                            {resolveAnswer(b.answer)}
                          </span>
                        </div>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="上へ"
                            disabled={idx === 0}
                            onClick={() => moveButton(b.id, "up")}
                          >
                            <ArrowUp size={20} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="下へ"
                            disabled={idx === buttons.length - 1}
                            onClick={() => moveButton(b.id, "down")}
                          >
                            <ArrowDown size={20} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label="編集"
                            onClick={() =>
                              setEditor({ mode: "edit", button: b })
                            }
                          >
                            <Pencil size={20} />
                          </button>
                          <button
                            type="button"
                            className={`${styles.iconBtn} ${styles.danger}`}
                            aria-label="削除"
                            onClick={() => {
                              if (confirm(`「${b.title}」を削除しますか？`)) {
                                removeButton(b.id);
                              }
                            }}
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {/* ---------- リセット ---------- */}
      <section className={styles.section}>
        <button
          type="button"
          className={styles.resetBtn}
          onClick={() => {
            if (
              confirm(
                "すべての内容を初期テンプレートに戻します。今の内容は消えます。よろしいですか？",
              )
            ) {
              resetToTemplate();
            }
          }}
        >
          <RotateCcw size={22} /> 初期テンプレートに戻す
        </button>
      </section>

      <div className={styles.footer}>
        <BackButton href="/senior" label="ホームにもどる" />
      </div>

      {editor.mode !== "closed" && (
        <ButtonEditor
          initial={editor.mode === "edit" ? editor.button : null}
          defaultCategoryId={
            editor.mode === "add"
              ? editor.categoryId
              : (categories[0]?.id ?? "")
          }
          categories={categories}
          onSave={handleSaveButton}
          onCancel={() => setEditor({ mode: "closed" })}
        />
      )}
    </main>
  );
}

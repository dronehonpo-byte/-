"use client";
/**
 * 本人モード ホーム（機能①）。
 * カテゴリの大ボタングリッド。最下部に「もどる」。
 * 設定（家族が編集）への入口は控えめに右上に置く。
 */
import Link from "next/link";
import { Settings } from "lucide-react";
import { CategoryGrid } from "@/components/CategoryGrid";
import { BackButton } from "@/components/BackButton";
import { useVoiceButtons } from "@/hooks/useVoiceButtons";
import { useHydrated } from "@/hooks/useHydrated";
import styles from "./senior.module.css";

export default function SeniorHomePage() {
  const { categories, buttonsOf } = useVoiceButtons();
  const hydrated = useHydrated();

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>きいてみましょう</h1>
        <Link
          href="/senior/settings"
          className={styles.settingsLink}
          aria-label="設定（ご家族が編集）"
        >
          <Settings size={28} />
          <span>設定</span>
        </Link>
      </div>

      {hydrated ? (
        <CategoryGrid
          categories={categories}
          countOf={(id) => buttonsOf(id).length}
        />
      ) : (
        <p className={styles.loading}>よみこみ中…</p>
      )}

      <div className={styles.footer}>
        <BackButton href="/" label="さいしょにもどる" />
      </div>
    </main>
  );
}

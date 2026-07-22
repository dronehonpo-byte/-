"use client";
/**
 * カテゴリの大ボタングリッド（本人モードのホーム）。
 * 各タイルは子画面 /senior/category/[id] への Link（フルリロードしない）。
 */
import Link from "next/link";
import { resolveIcon } from "@/lib/icons";
import type { VoiceCategory } from "@/types/voice";
import styles from "./CategoryGrid.module.css";

interface CategoryGridProps {
  categories: VoiceCategory[];
  /** 各カテゴリのボタン数（タイルに件数表示） */
  countOf: (categoryId: string) => number;
}

export function CategoryGrid({ categories, countOf }: CategoryGridProps) {
  return (
    <div className={styles.grid}>
      {categories.map((cat) => {
        const Icon = resolveIcon(cat.icon);
        return (
          <Link
            key={cat.id}
            href={`/senior/category/${cat.id}`}
            className={styles.tile}
          >
            <span className={styles.iconWrap} aria-hidden>
              <Icon size={80} strokeWidth={2} />
            </span>
            <span className={styles.title}>{cat.title}</span>
            <span className={styles.count}>{countOf(cat.id)} こ</span>
          </Link>
        );
      })}
    </div>
  );
}

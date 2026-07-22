"use client";
/**
 * アイコン選択（設定画面用）。IconKey を選ぶ。
 */
import { ICON_CHOICES, resolveIcon } from "@/lib/icons";
import type { IconKey } from "@/types/voice";
import styles from "./IconPicker.module.css";

interface IconPickerProps {
  value: IconKey;
  onChange: (icon: IconKey) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className={styles.grid} role="radiogroup" aria-label="アイコンを選ぶ">
      {ICON_CHOICES.map(({ key, label }) => {
        const Icon = resolveIcon(key);
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            className={`${styles.item} ${selected ? styles.selected : ""}`}
            onClick={() => onChange(key)}
          >
            <Icon size={32} />
          </button>
        );
      })}
    </div>
  );
}

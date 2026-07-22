"use client";
/**
 * トースト表示ホスト。layout に一度だけ置く。
 */
import { useToastStore } from "@/stores/toastStore";
import { X } from "lucide-react";
import styles from "./ToastHost.module.css";

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className={styles.host} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`${styles.toast} ${styles[t.variant]}`}>
          <span className={styles.message}>{t.message}</span>
          <button
            type="button"
            className={styles.close}
            aria-label="閉じる"
            onClick={() => dismiss(t.id)}
          >
            <X size={22} />
          </button>
        </div>
      ))}
    </div>
  );
}

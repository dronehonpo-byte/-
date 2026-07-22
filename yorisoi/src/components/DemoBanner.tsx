/**
 * Web デモ版の制約バナー（家族モードで常時表示）。
 * サーバーコンポーネント（状態を持たない）。
 */
import { Info } from "lucide-react";
import styles from "./DemoBanner.module.css";

interface DemoBannerProps {
  children: React.ReactNode;
}

export function DemoBanner({ children }: DemoBannerProps) {
  return (
    <div className={styles.banner} role="note">
      <Info size={24} className={styles.icon} aria-hidden />
      <p className={styles.text}>{children}</p>
    </div>
  );
}

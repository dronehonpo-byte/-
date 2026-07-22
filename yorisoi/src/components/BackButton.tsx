"use client";
/**
 * 常時最下部に置く大きな「戻る」ボタン（本人モード向け）。
 * フルリロードを避けるため router.back() / Link を使う。
 */
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import styles from "./BackButton.module.css";

interface BackButtonProps {
  /** 明示的な戻り先。未指定なら履歴を戻る */
  href?: string;
  label?: string;
}

export function BackButton({ href, label = "もどる" }: BackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };

  return (
    <button type="button" className={styles.back} onClick={handleClick}>
      <ChevronLeft size={40} strokeWidth={2.5} />
      <span>{label}</span>
    </button>
  );
}

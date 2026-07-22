"use client";
/**
 * ロール選択画面（アプリの入口）。
 * 本人（見守られる側）か家族（見守る側）かを選ぶ。
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartHandshake, User, Users, QrCode } from "lucide-react";
import { useUserStore } from "@/stores/userStore";
import styles from "./page.module.css";

export default function RoleSelectPage() {
  const router = useRouter();
  const setRole = useUserStore((s) => s.setRole);

  const choose = (role: "senior" | "family", href: string) => {
    setRole(role);
    router.push(href);
  };

  return (
    <main className={styles.main}>
      <header className={styles.brand}>
        <span className={styles.logoMark} aria-hidden>
          <HeartHandshake size={40} />
        </span>
        <div>
          <h1 className={styles.logoText}>YORISOI</h1>
          <p className={styles.tagline}>やさしく、よりそう。</p>
        </div>
      </header>

      <p className={styles.lead}>どちらで つかいますか？</p>

      <div className={styles.choices}>
        <button
          type="button"
          className={`${styles.choice} ${styles.senior}`}
          onClick={() => choose("senior", "/senior")}
        >
          <span className={styles.choiceIcon} aria-hidden>
            <User size={72} />
          </span>
          <span className={styles.choiceTitle}>ご本人</span>
          <span className={styles.choiceDesc}>音声で 生活を サポート</span>
        </button>

        <button
          type="button"
          className={`${styles.choice} ${styles.family}`}
          onClick={() => choose("family", "/family")}
        >
          <span className={styles.choiceIcon} aria-hidden>
            <Users size={72} />
          </span>
          <span className={styles.choiceTitle}>ご家族</span>
          <span className={styles.choiceDesc}>大切な人を 見守る</span>
        </button>
      </div>

      <Link href="/pairing" className={styles.pairingLink}>
        <QrCode size={24} />
        QR で端末をつなぐ（ペアリング）
      </Link>

      <p className={styles.note}>
        これは内部確認用の Web デモ版です。データはこの端末内にのみ保存されます。
      </p>
    </main>
  );
}

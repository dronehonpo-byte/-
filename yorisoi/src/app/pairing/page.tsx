"use client";
/**
 * QR ペアリング画面（低優先・擬似実装）。
 *  - モックログイン（Apple/Google風ダミー、localStorage 保存のみ）
 *  - QR 生成（qrcode.react）: 本人端末が発行して家族が読み取る想定
 *  - QR 読み取り（html5-qrcode）: 家族端末が読み取る想定
 *  - ペアリングID は UUID を localStorage に保存するだけ
 */
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Apple, Chrome, UserCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { QrScanner } from "@/components/QrScanner";
import { usePairing } from "@/hooks/usePairing";
import { useHydrated } from "@/hooks/useHydrated";
import { useUserStore } from "@/stores/userStore";
import { useToastStore } from "@/stores/toastStore";
import styles from "./pairing.module.css";

export default function PairingPage() {
  const hydrated = useHydrated();
  const {
    pairing,
    issuePairing,
    completePairing,
    resetPairing,
    buildPayload,
    parsePayload,
  } = usePairing();

  const loggedIn = useUserStore((s) => s.loggedIn);
  const displayName = useUserStore((s) => s.displayName);
  const login = useUserStore((s) => s.login);
  const logout = useUserStore((s) => s.logout);
  const showToast = useToastStore((s) => s.show);

  const [mode, setMode] = useState<"show" | "scan">("show");

  const handleScan = (raw: string) => {
    const id = parsePayload(raw);
    if (!id) {
      showToast("QRコードを読み取れませんでした", "warning");
      return;
    }
    completePairing(id, "家族の端末");
    showToast("ペアリングが完了しました", "success");
  };

  if (!hydrated) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>ペアリング</h1>
        <p className={styles.loading}>よみこみ中…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>端末をつなぐ（ペアリング）</h1>
      <p className={styles.desc}>
        これはデモ用の擬似ペアリングです。実際の通信は行わず、IDをこの端末に保存するだけです。
      </p>

      {/* ---------- モックログイン ---------- */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>ログイン</h2>
        {loggedIn ? (
          <div className={styles.loggedIn}>
            <p className={styles.loggedInText}>
              <CheckCircle2 size={24} /> {displayName} でログイン中
            </p>
            <button type="button" className={styles.textBtn} onClick={logout}>
              ログアウト
            </button>
          </div>
        ) : (
          <div className={styles.loginButtons}>
            <button
              type="button"
              className={`${styles.loginBtn} ${styles.apple}`}
              onClick={() => login("apple", "Apple ユーザー")}
            >
              <Apple size={24} /> Appleでログイン
            </button>
            <button
              type="button"
              className={`${styles.loginBtn} ${styles.google}`}
              onClick={() => login("google", "Google ユーザー")}
            >
              <Chrome size={24} /> Googleでログイン
            </button>
            <button
              type="button"
              className={`${styles.loginBtn} ${styles.demo}`}
              onClick={() => login("demo", "デモユーザー")}
            >
              <UserCircle size={24} /> デモとして続ける
            </button>
          </div>
        )}
      </section>

      {/* ---------- ペアリング状態 ---------- */}
      {pairing?.paired && (
        <section className={`${styles.card} ${styles.pairedCard}`}>
          <p className={styles.pairedText}>
            <CheckCircle2 size={24} /> ペアリング済み
            {pairing.peerName ? `（${pairing.peerName}）` : ""}
          </p>
          <button type="button" className={styles.textBtn} onClick={resetPairing}>
            ペアリングを解除
          </button>
        </section>
      )}

      {/* ---------- モード切り替え ---------- */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${mode === "show" ? styles.tabActive : ""}`}
          onClick={() => setMode("show")}
        >
          QRを表示（本人）
        </button>
        <button
          type="button"
          className={`${styles.tab} ${mode === "scan" ? styles.tabActive : ""}`}
          onClick={() => setMode("scan")}
        >
          QRを読み取る（家族）
        </button>
      </div>

      {mode === "show" ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>このQRを家族に読み取ってもらう</h2>
          {pairing ? (
            <div className={styles.qrWrap}>
              <div className={styles.qrBox}>
                <QRCodeSVG value={buildPayload(pairing.id)} size={220} level="M" />
              </div>
              <p className={styles.idText}>ID: {pairing.id}</p>
              <button
                type="button"
                className={styles.reissueBtn}
                onClick={() => issuePairing()}
              >
                <RefreshCw size={20} /> IDを再発行
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles.issueBtn}
              onClick={() => issuePairing()}
            >
              ペアリングIDを発行する
            </button>
          )}
        </section>
      ) : (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>本人のQRを読み取る</h2>
          <QrScanner onDetected={handleScan} />
        </section>
      )}

      <div className={styles.footer}>
        <BackButton href="/" label="最初に戻る" />
      </div>
    </main>
  );
}

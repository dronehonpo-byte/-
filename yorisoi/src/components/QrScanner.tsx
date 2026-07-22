"use client";
/**
 * QR コード読み取り（html5-qrcode）。
 * カメラが使えない環境向けに、手動入力のフォールバックも用意する。
 */
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard } from "lucide-react";
import styles from "./QrScanner.module.css";

interface QrScannerProps {
  onDetected: (text: string) => void;
}

const ELEMENT_ID = "yorisoi-qr-reader";

export function QrScanner({ onDetected }: QrScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  // html5-qrcode の Html5Qrcode インスタンス（型は動的 import のため unknown 管理）
  const instanceRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );

  useEffect(() => {
    return () => {
      // アンマウント時にカメラを停止
      const inst = instanceRef.current;
      if (inst) {
        inst.stop().then(() => inst.clear()).catch(() => undefined);
        instanceRef.current = null;
      }
    };
  }, []);

  const start = async () => {
    setError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode(ELEMENT_ID);
      instanceRef.current = {
        stop: () => scanner.stop(),
        clear: () => scanner.clear(),
      };
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          onDetected(decoded);
          scanner
            .stop()
            .then(() => scanner.clear())
            .catch(() => undefined);
          instanceRef.current = null;
          setScanning(false);
        },
        () => {
          // 各フレームの読み取り失敗は無視
        },
      );
    } catch (e) {
      setScanning(false);
      setError(
        e instanceof Error
          ? `カメラを起動できませんでした（${e.message}）。手動入力をご利用ください。`
          : "カメラを起動できませんでした。手動入力をご利用ください。",
      );
    }
  };

  const stop = async () => {
    const inst = instanceRef.current;
    if (inst) {
      await inst.stop().catch(() => undefined);
      inst.clear();
      instanceRef.current = null;
    }
    setScanning(false);
  };

  return (
    <div className={styles.wrap}>
      <div id={ELEMENT_ID} className={styles.reader} />

      {!scanning ? (
        <button type="button" className={styles.startBtn} onClick={() => void start()}>
          <Camera size={24} /> カメラで読み取る
        </button>
      ) : (
        <button type="button" className={styles.stopBtn} onClick={() => void stop()}>
          <CameraOff size={24} /> 読み取りを止める
        </button>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.manual}>
        <label className={styles.manualLabel} htmlFor="manual-id">
          <Keyboard size={20} /> 手動でIDを入力
        </label>
        <div className={styles.manualRow}>
          <input
            id="manual-id"
            className={styles.manualInput}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="ペアリングID または yorisoi://pair/..."
          />
          <button
            type="button"
            className={styles.manualBtn}
            onClick={() => manual.trim() && onDetected(manual.trim())}
            disabled={!manual.trim()}
          >
            つなぐ
          </button>
        </div>
      </div>
    </div>
  );
}

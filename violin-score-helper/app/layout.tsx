import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "バイオリン楽譜ヘルパー｜弦色分け・運指・半音マーク",
  description:
    "楽譜写真から、使う弦の色分け・指番号・半音マークを自動付与し、練習音源をテンポ調整して弾ける学習支援アプリ。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

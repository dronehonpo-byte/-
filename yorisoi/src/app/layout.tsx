import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastHost } from "@/components/ToastHost";

export const metadata: Metadata = {
  title: "YORISOI（よりそい）| 見守りデモ",
  description:
    "介護支援アプリ YORISOI の内部デモ版。音声生活サポートと家族の見守り機能。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // 高齢者がピンチ拡大できるよう制限しない
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        {children}
        <ToastHost />
      </body>
    </html>
  );
}

/**
 * サイト全体で使う定数（外部リンク、会社情報、SEO）をまとめて管理。
 * 環境変数で上書き可能。
 */

export const siteConfig = {
  name: "KUHAKU",
  tagline: "社長専用、AI業務代行。月10万円から。",
  description:
    "中小企業の社長専用 AI業務代行サービス。メール・議事録・レポート・見積もりなど、社長がやらなくていい業務を AI に巻き取らせます。削減時間は事前に約束し、達成できなければ全額返金。月10万円から。",
  url: "https://kuhaku.miyabee.jp",
  ogImage: "/og.png",
  keywords: [
    "AI業務代行",
    "業務自動化",
    "中小企業",
    "社長業務",
    "完全成果報酬",
    "ChatGPT",
    "Claude",
    "Google Apps Script",
    "KUHAKU",
    "株式会社Miyabee",
  ],
};

export const company = {
  name: "株式会社Miyabee",
  nameEn: "Miyabee Inc.",
  postal: "101-0041",
  address: "東京都千代田区神田須田町1丁目7番地8 VORT秋葉原2F",
  tel: "070-9190-9320",
  email: "info@dronehonpo.jp",
  founded: "令和6年12月（2024年12月）",
  capital: "50万円",
  licenses: "古物商許可（埼玉県）",
};

export const ctaLinks = {
  timerex:
    process.env.NEXT_PUBLIC_TIMEREX_URL ??
    "https://timerex.net/s/dronehonpo_dbab/8ea01e5e",
  line: process.env.NEXT_PUBLIC_LINE_URL ?? "https://lin.ee/RtTNUsZ",
  diagnosis: "/ai-shindan",
};

export const gaId = process.env.NEXT_PUBLIC_GA_ID ?? "";

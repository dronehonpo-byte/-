/**
 * おすすめセット5種 + フルパッケージ。
 * AI診断の「Step 2で選択された業務」とのマッチングに使う tags を持つ。
 */

import { Menu, menus } from "./menus";

export type SetBundle = {
  id: string;
  emoji: string;
  name: string;
  summary: string;
  menuIds: string[];
  listPrice: number; // 万円
  price: number; // 万円
  tags: string[]; // AI診断で紐付ける業務タグ
};

export const setBundles: SetBundle[] = [
  {
    id: "time-back",
    emoji: "🕐",
    name: "社長の時間を取り戻す",
    summary:
      "メール・議事録・日程調整をまとめて自動化。1日2時間を取り戻すセット。",
    menuIds: ["B-1", "B-2", "B-3"],
    listPrice: 45,
    price: 38,
    tags: ["メール", "議事録"],
  },
  {
    id: "sales-boost",
    emoji: "🎯",
    name: "営業を倍速化",
    summary:
      "リスト生成 × パーソナライズメール × 議事録で、営業プロセスを一気通貫で自動化。",
    menuIds: ["S-1", "S-2", "S-3"],
    listPrice: 50,
    price: 42,
    tags: ["営業"],
  },
  {
    id: "sns-auto",
    emoji: "📣",
    name: "SNSマーケフルオート",
    summary:
      "SNS投稿・ブログSEO・リール台本・メルマガを同時稼働。マーケを人手ゼロに。",
    menuIds: ["M-1", "M-2", "M-3", "M-5"],
    listPrice: 50,
    price: 42,
    tags: ["SNS", "マーケ"],
  },
  {
    id: "paperwork-zero",
    emoji: "📄",
    name: "書類仕事ゼロ",
    summary:
      "請求書データ化・マニュアル生成・週報要約の3点セットでバックオフィスを無人化。",
    menuIds: ["D-1", "D-2", "D-4"],
    listPrice: 35,
    price: 30,
    tags: ["請求書", "資料作成"],
  },
  {
    id: "hiring",
    emoji: "👥",
    name: "採用効率化",
    summary:
      "スクリーニング・面接質問・エンゲージメント分析で、採用から定着まで一気通貫。",
    menuIds: ["H-1", "H-2", "H-4"],
    listPrice: 45,
    price: 38,
    tags: ["採用"],
  },
];

export const fullPackage = {
  name: "KUHAKUフルパッケージ",
  listPrice: 380, // 万円
  price: 280, // 万円
  discountRate: 0.26,
  target: "年商3億円以上 or 従業員30名以上の中小企業",
  leadtime: "3〜4ヶ月で段階リリース",
  includes: [
    "全25メニュー導入",
    "1年間の保守サポート",
    "専任担当者によるコンサルティング",
  ],
  menuIds: menus.map((m) => m.id),
};

export const discountTiers: { count: string; rate: string }[] = [
  { count: "2メニュー", rate: "5% OFF" },
  { count: "3メニュー", rate: "10% OFF" },
  { count: "5メニュー以上", rate: "15% OFF" },
  { count: "10メニュー以上", rate: "20% OFF" },
];

export function getSetMenus(bundle: SetBundle): Menu[] {
  return bundle.menuIds
    .map((id) => menus.find((m) => m.id === id))
    .filter((m): m is Menu => Boolean(m));
}

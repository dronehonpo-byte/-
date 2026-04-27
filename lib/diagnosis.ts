/**
 * AI診断ページの計算ロジック（v2: 中小企業向けに全面書き換え）。
 *
 *  削減時間（月） = baseHours[従業員数] × カテゴリ係数 × AI活用度係数
 *  ただし上限 hoursCap[従業員数] でクランプ
 *  金額換算       = 削減時間 × 平均人件費 3,000円/h
 */

import { menus, type Menu } from "./menus";
import { setBundles, type SetBundle } from "./sets";

export type EmployeeRange = "1-5" | "6-20" | "21-50" | "51+";
export type AiUsage = "none" | "partial" | "company-wide";
export type Budget = "<10" | "10-30" | "30-50" | "50+";
export type StartTiming = "asap" | "1m" | "3m" | "considering";

export type WorkTag =
  | "メール対応"
  | "会議・議事録"
  | "レポート・資料作成"
  | "顧客問い合わせ"
  | "請求書・経費処理"
  | "採用業務"
  | "その他";

/** 基準となる月間削減時間（h）。AI未活用・1カテゴリ選択時のベース値。 */
const baseHours: Record<EmployeeRange, number> = {
  "1-5": 30,
  "6-20": 60,
  "21-50": 100,
  "51+": 180,
};

/** 従業員規模ごとの上限（現実的な数値に収めるため）。 */
const hoursCap: Record<EmployeeRange, number> = {
  "1-5": 80,
  "6-20": 150,
  "21-50": 250,
  "51+": 400,
};

/** AI活用度による係数。未活用ほど削減余地が大きい。 */
const aiUsageMultiplier: Record<AiUsage, number> = {
  none: 1.5,
  partial: 1.2,
  "company-wide": 1.0,
};

/** 平均人件費（円/h） */
export const HOURLY_RATE = 3000;

export const employeeOptions: { value: EmployeeRange; label: string }[] = [
  { value: "1-5", label: "1〜5名" },
  { value: "6-20", label: "6〜20名" },
  { value: "21-50", label: "21〜50名" },
  { value: "51+", label: "51名以上" },
];

export const workOptions: { value: WorkTag; label: string; emoji: string }[] = [
  { value: "メール対応", label: "メール対応", emoji: "📧" },
  { value: "会議・議事録", label: "会議・議事録", emoji: "📝" },
  { value: "レポート・資料作成", label: "レポート・資料作成", emoji: "📄" },
  { value: "顧客問い合わせ", label: "顧客問い合わせ", emoji: "💬" },
  { value: "請求書・経費処理", label: "請求書・経費処理", emoji: "🧾" },
  { value: "採用業務", label: "採用業務", emoji: "👥" },
  { value: "その他", label: "その他", emoji: "⚙️" },
];

export const aiUsageOptions: { value: AiUsage; label: string }[] = [
  { value: "none", label: "全く使っていない" },
  { value: "partial", label: "一部社員が使っている" },
  { value: "company-wide", label: "全社的に活用中" },
];

export const budgetOptions: { value: Budget; label: string }[] = [
  { value: "<10", label: "〜10万円" },
  { value: "10-30", label: "10〜30万円" },
  { value: "30-50", label: "30〜50万円" },
  { value: "50+", label: "50万円以上" },
];

export const timingOptions: { value: StartTiming; label: string }[] = [
  { value: "asap", label: "すぐに" },
  { value: "1m", label: "1ヶ月以内" },
  { value: "3m", label: "3ヶ月以内" },
  { value: "considering", label: "検討中" },
];

export type DiagnosisInput = {
  employees: EmployeeRange;
  works: WorkTag[];
  aiUsage: AiUsage;
  budget: Budget;
  timing: StartTiming;
};

export type DiagnosisResult = {
  reducedHours: number; // 月あたり削減時間
  reducedAmount: number; // 月あたり金額（円）
  annualAmount: number; // 年間金額（円）
  recommendedMenus: Menu[]; // Top3
  recommendedSet: SetBundle | null;
};

/** 業務タグ → メニューID マッピング */
const menuMap: Record<WorkTag, string> = {
  メール対応: "B-1",
  "会議・議事録": "B-2",
  "レポート・資料作成": "D-5",
  顧客問い合わせ: "S-3",
  "請求書・経費処理": "D-1",
  採用業務: "H-1",
  その他: "M-1",
};

export function calculate(input: DiagnosisInput): DiagnosisResult {
  const base = baseHours[input.employees];
  // カテゴリ係数（上限2.0）
  const categoryCount = Math.max(1, input.works.length);
  const categoryMultiplier = Math.min(1 + (categoryCount - 1) * 0.2, 2.0);
  const usage = aiUsageMultiplier[input.aiUsage];

  let reducedHours = Math.round(base * categoryMultiplier * usage);
  reducedHours = Math.min(reducedHours, hoursCap[input.employees]);

  const reducedAmount = reducedHours * HOURLY_RATE;
  const annualAmount = reducedAmount * 12;

  // 選択された業務に紐付くメニューを最大3つ
  const recommendedMenuIds = input.works
    .map((w) => menuMap[w])
    .filter(Boolean)
    .slice(0, 3);
  const recommendedMenus = recommendedMenuIds
    .map((id) => menus.find((m) => m.id === id))
    .filter((m): m is Menu => Boolean(m));

  // セット推奨：含まれるメニューと選択業務メニューの重なりが多いものを選ぶ
  const setScored = setBundles
    .map((set) => {
      const overlap = set.menuIds.filter((id) =>
        recommendedMenuIds.includes(id),
      ).length;
      return { set, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap);
  const recommendedSet =
    setScored[0] && setScored[0].overlap >= 1 ? setScored[0].set : null;

  return {
    reducedHours,
    reducedAmount,
    annualAmount,
    recommendedMenus,
    recommendedSet,
  };
}

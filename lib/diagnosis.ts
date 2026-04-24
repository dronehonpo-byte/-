/**
 * AI診断ページの計算ロジック。
 *
 * 削減時間（月） = 週時間中央値 × 4 × 0.7 × 規模係数
 * 金額換算     = 削減時間 × 時給
 */

import { menus, type Menu } from "./menus";
import { setBundles, type SetBundle } from "./sets";

export type EmployeeRange = "1-5" | "6-20" | "21-50" | "51+";
export type WeeklyHours = "<5" | "5-15" | "15-30" | "30+";
export type HourlyRate = "3000" | "5000" | "10000" | "20000";

export type WorkTag =
  | "メール"
  | "議事録"
  | "資料作成"
  | "請求書"
  | "採用"
  | "営業"
  | "SNS"
  | "その他";

export const employeeOptions: {
  value: EmployeeRange;
  label: string;
  coefficient: number;
}[] = [
  { value: "1-5", label: "1〜5名", coefficient: 1.0 },
  { value: "6-20", label: "6〜20名", coefficient: 1.3 },
  { value: "21-50", label: "21〜50名", coefficient: 1.6 },
  { value: "51+", label: "51名以上", coefficient: 2.0 },
];

export const workOptions: { value: WorkTag; label: string; emoji: string }[] = [
  { value: "メール", label: "メール対応", emoji: "📧" },
  { value: "議事録", label: "議事録作成", emoji: "📝" },
  { value: "資料作成", label: "資料・スライド作成", emoji: "📄" },
  { value: "請求書", label: "請求書処理", emoji: "🧾" },
  { value: "採用", label: "採用・人事", emoji: "👥" },
  { value: "営業", label: "営業・リスト作成", emoji: "🎯" },
  { value: "SNS", label: "SNS・マーケ", emoji: "📣" },
  { value: "その他", label: "その他定型業務", emoji: "⚙️" },
];

export const weeklyHoursOptions: {
  value: WeeklyHours;
  label: string;
  median: number;
}[] = [
  { value: "<5", label: "〜5時間", median: 3 },
  { value: "5-15", label: "5〜15時間", median: 10 },
  { value: "15-30", label: "15〜30時間", median: 22 },
  { value: "30+", label: "30時間以上", median: 35 },
];

export const hourlyRateOptions: {
  value: HourlyRate;
  label: string;
  yen: number;
}[] = [
  { value: "3000", label: "3,000円", yen: 3000 },
  { value: "5000", label: "5,000円", yen: 5000 },
  { value: "10000", label: "10,000円", yen: 10000 },
  { value: "20000", label: "20,000円以上", yen: 20000 },
];

export type DiagnosisInput = {
  employees: EmployeeRange;
  works: WorkTag[];
  weeklyHours: WeeklyHours;
  hourlyRate: HourlyRate;
};

export type DiagnosisResult = {
  savedHours: number; // 月あたり削減時間
  savedYen: number; // 月あたり金額
  recommendedMenus: Menu[]; // Top3
  recommendedSet: SetBundle | null;
};

export function calculate(input: DiagnosisInput): DiagnosisResult {
  const median =
    weeklyHoursOptions.find((o) => o.value === input.weeklyHours)?.median ?? 10;
  const coef =
    employeeOptions.find((o) => o.value === input.employees)?.coefficient ?? 1;
  const rate =
    hourlyRateOptions.find((o) => o.value === input.hourlyRate)?.yen ?? 5000;

  const savedHours = Math.round(median * 4 * 0.7 * coef);
  const savedYen = savedHours * rate;

  // 業務タグ → メニュー推奨
  const scored = menus
    .map((menu) => {
      const matchCount = menu.tags.filter((t) =>
        input.works.includes(t as WorkTag),
      ).length;
      // featured は +0.5 の下駄
      const score = matchCount + (menu.featured ? 0.5 : 0);
      return { menu, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.menu.price - b.menu.price);

  const recommendedMenus = scored.slice(0, 3).map((s) => s.menu);

  // セット推奨（tagsが2つ以上マッチしたら最初のものを推奨）
  const setScored = setBundles
    .map((set) => {
      const match = set.tags.filter((t) =>
        input.works.includes(t as WorkTag),
      ).length;
      return { set, match };
    })
    .sort((a, b) => b.match - a.match);
  const recommendedSet =
    setScored[0] && setScored[0].match >= 1 ? setScored[0].set : null;

  return {
    savedHours,
    savedYen,
    recommendedMenus,
    recommendedSet,
  };
}

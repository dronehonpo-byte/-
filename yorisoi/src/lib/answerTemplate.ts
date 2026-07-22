/**
 * 回答文のプレースホルダ解決。
 *
 * 家族が登録する回答文に以下のトークンを含められる。
 * デモで「今日は何曜日／何日」が常に正しく答えられるようにするための仕組み。
 *   {曜日}  → 例: 火曜日
 *   {日付}  → 例: 7月21日
 *   {年月日} → 例: 2026年7月21日
 */
const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

export function resolveAnswer(text: string, now: Date = new Date()): string {
  const weekday = `${WEEKDAYS[now.getDay()]}曜日`;
  const date = `${now.getMonth() + 1}月${now.getDate()}日`;
  const full = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  return text
    .replaceAll("{曜日}", weekday)
    .replaceAll("{日付}", date)
    .replaceAll("{年月日}", full);
}

/** 回答文にプレースホルダが含まれるか（設定画面のヒント表示用） */
export function hasPlaceholder(text: string): boolean {
  return /\{(曜日|日付|年月日)\}/.test(text);
}

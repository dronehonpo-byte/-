/**
 * ID 生成ユーティリティ。
 *
 * crypto.randomUUID が使える環境ではそれを使い、
 * 無い場合は簡易フォールバックを用いる（デモ用途で衝突許容）。
 */
export function generateId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // フォールバック（RFC4122 完全準拠ではない）
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

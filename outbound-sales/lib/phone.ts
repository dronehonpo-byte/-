// 電話番号の正規化(日本の番号を E.164 に統一して DNC 照合の取りこぼしを防ぐ)

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  if (digits.startsWith("+")) {
    const rest = digits.slice(1).replace(/\D/g, "");
    return rest.length >= 8 ? `+${rest}` : null;
  }
  // 0始まりの国内番号 → +81
  if (digits.startsWith("0") && digits.length >= 10 && digits.length <= 11) {
    return `+81${digits.slice(1)}`;
  }
  return null;
}

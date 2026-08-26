/**
 * スキャン品質の簡易判定（純粋関数）
 *
 * 本アプリはスキャンデータ専用。スマホ撮影の写真は認識精度が安定しないため、
 * 明らかに「撮影写真らしい」画像を検出して警告を出す（ブロックはしない）。
 *
 * 判定はブラウザ側で画像を縮小サンプリングして得たピクセル統計に対して行う。
 * ここは統計値だけを受け取る純粋関数なので、単体テストしやすい。
 *
 * ヒューリスティック（スキャンの特徴 = 撮影写真ではない）:
 *   - 背景（周縁部）が明るい＝白い          … スキャンは白地
 *   - 全体の彩度が低い（ほぼグレースケール） … 楽譜スキャンは白黒
 *   - 明暗のコントラストが十分              … 影・光ムラがあると崩れる
 */

export interface PixelStats {
  /** 画像全体の平均輝度 0..255 */
  meanLuma: number;
  /** 周縁部（上下左右の縁）の平均輝度 0..255。スキャンは高い(白)。 */
  borderMeanLuma: number;
  /** 画像全体の平均彩度 0..255。スキャン(白黒)は低い。 */
  meanSaturation: number;
  /** 周縁部の輝度の標準偏差。光ムラ/影が強いと大きい。 */
  borderLumaStd: number;
}

export interface ScanAssessment {
  /** 撮影写真の可能性が高いか */
  isLikelyPhoto: boolean;
  /** 前提（水平・白背景・影なし）を満たさない懸念点 */
  warnings: string[];
}

/** 各しきい値。画像の傾向に合わせて調整可能。 */
export const SCAN_THRESHOLDS = {
  /** これ未満だと背景が暗い＝白地スキャンでない疑い */
  borderBrightMin: 190,
  /** これを超えると色が乗っている＝写真/カラー原稿の疑い */
  saturationMax: 40,
  /** 周縁輝度のばらつきがこれを超えると光ムラ/影の疑い */
  borderStdMax: 45,
} as const;

/**
 * ピクセル統計 → 判定。理由（warnings）が1つでもあれば isLikelyPhoto=true。
 */
export function assessScan(stats: PixelStats): ScanAssessment {
  const warnings: string[] = [];

  if (stats.borderMeanLuma < SCAN_THRESHOLDS.borderBrightMin) {
    warnings.push("背景が白くありません（スキャンではなく撮影写真の可能性）。");
  }
  if (stats.meanSaturation > SCAN_THRESHOLDS.saturationMax) {
    warnings.push("色みが強く検出されました（白黒スキャンを推奨）。");
  }
  if (stats.borderLumaStd > SCAN_THRESHOLDS.borderStdMax) {
    warnings.push("明るさのムラ・影が見られます（均一な照明でのスキャンを推奨）。");
  }

  return { isLikelyPhoto: warnings.length > 0, warnings };
}

/**
 * RGBA ピクセル配列（縮小済みでよい）→ PixelStats を計算する純粋関数。
 * ブラウザ側では canvas.getImageData().data を渡す。
 */
export function computePixelStats(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
): PixelStats {
  const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
  // 周縁部＝外周 borderRatio ぶんの帯
  const borderRatio = 0.08;
  const bx = Math.max(1, Math.floor(width * borderRatio));
  const by = Math.max(1, Math.floor(height * borderRatio));

  let sumLuma = 0;
  let sumSat = 0;
  let count = 0;

  let borderSum = 0;
  let borderSqSum = 0;
  let borderCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const l = luma(r, g, b);
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : ((max - min) / max) * 255;

      sumLuma += l;
      sumSat += sat;
      count += 1;

      const isBorder = x < bx || x >= width - bx || y < by || y >= height - by;
      if (isBorder) {
        borderSum += l;
        borderSqSum += l * l;
        borderCount += 1;
      }
    }
  }

  const meanLuma = count ? sumLuma / count : 0;
  const meanSaturation = count ? sumSat / count : 0;
  const borderMeanLuma = borderCount ? borderSum / borderCount : 0;
  const borderVar = borderCount ? borderSqSum / borderCount - borderMeanLuma * borderMeanLuma : 0;
  const borderLumaStd = Math.sqrt(Math.max(0, borderVar));

  return { meanLuma, borderMeanLuma, meanSaturation, borderLumaStd };
}

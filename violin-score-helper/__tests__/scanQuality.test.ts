import { describe, it, expect } from "vitest";
import { assessScan, computePixelStats } from "@/lib/scanQuality";

/** 単色で埋めた RGBA 配列を作る */
function solid(w: number, h: number, r: number, g: number, b: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return data;
}

describe("computePixelStats / assessScan", () => {
  it("白地グレースケール（＝スキャン）は写真と判定しない", () => {
    const data = solid(20, 20, 255, 255, 255);
    const stats = computePixelStats(data, 20, 20);
    expect(stats.borderMeanLuma).toBeGreaterThan(240);
    expect(stats.meanSaturation).toBeLessThan(10);
    const a = assessScan(stats);
    expect(a.isLikelyPhoto).toBe(false);
    expect(a.warnings).toHaveLength(0);
  });

  it("暗く色の乗った画像（＝撮影写真の疑い）は警告する", () => {
    const data = solid(20, 20, 80, 90, 140); // 青みがかって暗い
    const stats = computePixelStats(data, 20, 20);
    const a = assessScan(stats);
    expect(a.isLikelyPhoto).toBe(true);
    // 背景が暗い＆彩度高い の2点が該当
    expect(a.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("純黒に近い背景も白地ではないと警告する", () => {
    const data = solid(16, 16, 20, 20, 20);
    const stats = computePixelStats(data, 16, 16);
    expect(assessScan(stats).isLikelyPhoto).toBe(true);
  });
});

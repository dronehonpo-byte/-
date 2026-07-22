/**
 * 位置計算ユーティリティ（プラットフォーム非依存）。
 */
import type { GeoPoint } from "@/types/location";

/** 2 点間の距離（メートル）をハーバサイン公式で求める */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const R = 6_371_000; // 地球半径(m)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 点 p が中心 center・半径 radius(m) の円内にあるか */
export function isWithin(
  p: GeoPoint,
  center: GeoPoint,
  radiusMeters: number,
): boolean {
  return distanceMeters(p, center) <= radiusMeters;
}

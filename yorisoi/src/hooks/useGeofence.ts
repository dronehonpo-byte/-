"use client";
/**
 * 自宅ジオフェンス判定フック（Web では擬似実装）。
 *
 * 本番（iOS/Android）ではバックグラウンドで自宅離脱／帰宅を検知するが、
 * Web デモでは現在地とジオフェンス円の内外関係を「その場で」計算するだけ。
 */
import { useMemo } from "react";
import { distanceMeters, isWithin } from "@/lib/geo";
import type { WatchedPerson } from "@/types/location";

export interface GeofenceState {
  /** 自宅圏内にいるか */
  inside: boolean;
  /** 自宅中心からの距離（m）。現在地未取得なら null */
  distanceFromHome: number | null;
  /** 表示用ラベル */
  label: string;
}

export function useGeofence(person: WatchedPerson | null): GeofenceState {
  return useMemo(() => {
    if (!person || !person.current) {
      return { inside: false, distanceFromHome: null, label: "位置情報なし" };
    }
    const d = distanceMeters(person.current, person.geofence.center);
    const inside = isWithin(
      person.current,
      person.geofence.center,
      person.geofence.radiusMeters,
    );
    return {
      inside,
      distanceFromHome: Math.round(d),
      label: inside ? "自宅にいます" : "外出中",
    };
  }, [person]);
}

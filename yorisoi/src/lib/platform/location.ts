/**
 * プラットフォーム抽象化: 現在地取得
 *
 * Web 実装は `location.web.ts`（Geolocation API）。
 * RN/Expo 移行時は expo-location 実装に差し替える。
 *
 * DOM 型（GeolocationPosition 等）はこの interface に露出させない。
 */
import type { GeoPoint } from "@/types/location";

export interface LocationService {
  /**
   * 現在地を 1 回取得する。
   * 取得できない場合（権限拒否・非対応）は reject する。
   */
  getCurrentPosition(): Promise<GeoPoint>;
  /** この環境で位置取得が利用可能か */
  isSupported(): boolean;
}

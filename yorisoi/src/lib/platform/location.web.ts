/**
 * Web 実装: Geolocation API による現在地取得。
 *
 * デモでは「閲覧者の現在地」を擬似的に本人の現在地として扱う。
 * RN/Expo 移行時は expo-location 実装へ差し替える。
 * UI からは直接 `navigator.geolocation` を呼ばず、必ずこの層を経由する。
 */
import type { LocationService } from "./location";
import type { GeoPoint } from "@/types/location";

class WebLocationService implements LocationService {
  isSupported(): boolean {
    return (
      typeof navigator !== "undefined" && typeof navigator.geolocation !== "undefined"
    );
  }

  getCurrentPosition(): Promise<GeoPoint> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error("この環境では位置情報を取得できません"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          reject(new Error(err.message || "位置情報の取得に失敗しました"));
        },
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      );
    });
  }
}

export const webLocationService: LocationService = new WebLocationService();

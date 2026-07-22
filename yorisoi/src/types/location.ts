/**
 * ドメイン型: 見守り / 位置情報（機能②）
 *
 * Web / React Native 共有想定。DOM 型は含めない。
 */

/** 緯度経度の組 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/** タイムスタンプ付きの位置サンプル（ルート履歴の 1 点） */
export interface LocationSample extends GeoPoint {
  /** 取得日時（ISO 文字列） */
  timestamp: string;
}

/** 在宅状態バッジ */
export type PresenceStatus = "home" | "away";

/** 自宅ジオフェンス設定 */
export interface Geofence {
  /** 自宅の中心座標 */
  center: GeoPoint;
  /** 半径（メートル）。デモ既定は 100m */
  radiusMeters: number;
}

/** 1 日分の歩行ルート（ルート履歴で使用） */
export interface DailyRoute {
  /** 日付（YYYY-MM-DD） */
  date: string;
  /** その日の位置サンプル列（時系列） */
  points: LocationSample[];
  /** 歩行時間（分）。モック集計値 */
  walkingMinutes: number;
  /** 概算移動距離（メートル）。モック集計値 */
  distanceMeters: number;
}

/** 見守り対象者 1 名分の位置状態 */
export interface WatchedPerson {
  id: string;
  /** 表示名 */
  name: string;
  /** 現在地（未取得なら null） */
  current: LocationSample | null;
  /** 自宅ジオフェンス */
  geofence: Geofence;
  /** 現在の在宅状態 */
  status: PresenceStatus;
  /** 直近 7 日間のルート履歴（モック） */
  routes: DailyRoute[];
}

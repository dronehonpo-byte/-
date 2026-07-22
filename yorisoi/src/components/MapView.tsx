"use client";
/**
 * Leaflet + OpenStreetMap 地図。
 *
 * - 現在地マーカー / 自宅マーカー / ジオフェンス円（半径表示）
 * - ルート（ポリライン）
 *
 * Leaflet は window 依存のため、本体は useEffect 内で動的 import する。
 * さらにページ側では next/dynamic(ssr:false) でラップして SSR を回避する。
 * デフォルトのマーカー画像アセット問題を避けるため、円マーカー（circleMarker）
 * とポリラインのみを使う。
 */
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { GeoPoint, LocationSample } from "@/types/location";
import styles from "./MapView.module.css";

interface MapViewProps {
  /** 自宅座標 */
  home: GeoPoint;
  /** ジオフェンス半径(m) */
  radiusMeters: number;
  /** 現在地（無ければ表示しない） */
  current?: GeoPoint | null;
  /** ルート（ポリライン表示。無ければ描画しない） */
  route?: LocationSample[];
  /** 地図の高さ（CSS 値）。既定 420px */
  height?: string;
}

export function MapView({
  home,
  radiusMeters,
  current,
  route,
  height = "420px",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [home.lat, home.lng],
        zoom: 15,
        // 前庭覚配慮: 慣性・ズームアニメを抑える
        zoomAnimation: false,
        fadeAnimation: false,
      });

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // ジオフェンス円（半径100mなど）
      L.circle([home.lat, home.lng], {
        radius: radiusMeters,
        color: "#7a9471",
        fillColor: "#7a9471",
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(map);

      // 自宅マーカー
      L.circleMarker([home.lat, home.lng], {
        radius: 10,
        color: "#5f7a57",
        fillColor: "#7a9471",
        fillOpacity: 1,
        weight: 3,
      })
        .addTo(map)
        .bindPopup("自宅");

      // ルート（ポリライン）
      if (route && route.length > 1) {
        const latlngs: [number, number][] = route.map((p) => [p.lat, p.lng]);
        L.polyline(latlngs, {
          color: "#e8843c",
          weight: 5,
          opacity: 0.8,
        }).addTo(map);
      }

      // 現在地マーカー
      if (current) {
        L.circleMarker([current.lat, current.lng], {
          radius: 12,
          color: "#cf6d29",
          fillColor: "#e8843c",
          fillOpacity: 1,
          weight: 3,
        })
          .addTo(map)
          .bindPopup("現在地");

        const bounds = L.latLngBounds([
          [home.lat, home.lng],
          [current.lat, current.lng],
        ]);
        map.fitBounds(bounds.pad(0.4));
      }

      // コンテナサイズ確定後の再計算
      map.invalidateSize();

      cleanup = () => map.remove();
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [home.lat, home.lng, radiusMeters, current, route]);

  return <div ref={containerRef} className={styles.map} style={{ height }} />;
}

export default MapView;

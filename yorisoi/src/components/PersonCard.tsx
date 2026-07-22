"use client";
/**
 * 見守り対象者カード（家族ダッシュボード）。
 * 名前・現在地サマリ・最終更新時刻・状態バッジを表示。
 */
import { MapPin, Clock, Home, Footprints } from "lucide-react";
import { useGeofence } from "@/hooks/useGeofence";
import type { WatchedPerson } from "@/types/location";
import styles from "./PersonCard.module.css";

interface PersonCardProps {
  person: WatchedPerson;
  onOpenMap: (personId: string) => void;
}

function formatTime(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PersonCard({ person, onOpenMap }: PersonCardProps) {
  const geo = useGeofence(person);
  const atHome = geo.inside;

  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <h2 className={styles.name}>{person.name}</h2>
        <span className={`${styles.badge} ${atHome ? styles.home : styles.away}`}>
          {atHome ? <Home size={20} /> : <Footprints size={20} />}
          {geo.label}
        </span>
      </div>

      <dl className={styles.info}>
        <div className={styles.row}>
          <dt>
            <MapPin size={20} aria-hidden /> 現在地
          </dt>
          <dd>
            {geo.distanceFromHome === null
              ? "位置情報なし"
              : atHome
                ? "自宅の近く"
                : `自宅から約 ${geo.distanceFromHome} m`}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>
            <Clock size={20} aria-hidden /> 最終更新
          </dt>
          <dd>{formatTime(person.current?.timestamp)}</dd>
        </div>
      </dl>

      <button
        type="button"
        className={styles.mapButton}
        onClick={() => onOpenMap(person.id)}
      >
        地図で見る
      </button>
    </div>
  );
}

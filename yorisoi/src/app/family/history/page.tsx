"use client";
/**
 * 家族モード ルート履歴（機能②）。
 * 過去7日間のダミールートをポリライン表示。歩行時間・距離も表示。
 */
import { useState } from "react";
import dynamic from "next/dynamic";
import { Footprints, Route, Clock } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { DemoBanner } from "@/components/DemoBanner";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useHydrated } from "@/hooks/useHydrated";
import styles from "../family.module.css";
import historyStyles from "./history.module.css";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className={styles.loading}>地図を読み込み中…</div>,
});

function formatDate(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
}

export default function FamilyHistoryPage() {
  const hydrated = useHydrated();
  const { persons, selected, selectedId, selectPerson } = useLocationSharing();
  const [dayIndex, setDayIndex] = useState(0);

  if (!hydrated) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>ルート履歴</h1>
        <p className={styles.loading}>よみこみ中…</p>
      </main>
    );
  }

  // 新しい日付が先頭になるよう逆順に
  const routes = selected ? [...selected.routes].reverse() : [];
  const activeRoute = routes[dayIndex] ?? routes[0];

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>ルート履歴（過去7日間）</h1>

      <DemoBanner>
        表示しているルートはデモ用のモックデータです。実際の移動履歴ではありません。
      </DemoBanner>

      <div className={styles.personSelect}>
        {persons.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.personChip} ${
              p.id === selectedId ? styles.personChipActive : ""
            }`}
            onClick={() => {
              selectPerson(p.id);
              setDayIndex(0);
            }}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* 日付選択 */}
      <div className={historyStyles.dayScroller}>
        {routes.map((r, idx) => (
          <button
            key={r.date}
            type="button"
            className={`${historyStyles.dayChip} ${
              idx === dayIndex ? historyStyles.dayChipActive : ""
            }`}
            onClick={() => setDayIndex(idx)}
          >
            {formatDate(r.date)}
          </button>
        ))}
      </div>

      {selected && activeRoute && (
        <>
          <MapView
            home={selected.geofence.center}
            radiusMeters={selected.geofence.radiusMeters}
            route={activeRoute.points}
            current={null}
            height="360px"
          />

          <div className={historyStyles.stats}>
            <div className={historyStyles.stat}>
              <Clock size={28} />
              <div>
                <span className={historyStyles.statLabel}>歩いた時間</span>
                <span className={historyStyles.statValue}>
                  {activeRoute.walkingMinutes} 分
                </span>
              </div>
            </div>
            <div className={historyStyles.stat}>
              <Route size={28} />
              <div>
                <span className={historyStyles.statLabel}>移動距離</span>
                <span className={historyStyles.statValue}>
                  約 {(activeRoute.distanceMeters / 1000).toFixed(1)} km
                </span>
              </div>
            </div>
            <div className={historyStyles.stat}>
              <Footprints size={28} />
              <div>
                <span className={historyStyles.statLabel}>記録地点</span>
                <span className={historyStyles.statValue}>
                  {activeRoute.points.length} か所
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      <div className={styles.footer}>
        <BackButton href="/family" label="ダッシュボードに戻る" />
      </div>
    </main>
  );
}

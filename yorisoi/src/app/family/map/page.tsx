"use client";
/**
 * 家族モード 地図画面（機能②）。
 *  - Leaflet + OSM で現在地・自宅・ジオフェンス円
 *  - 「今すぐ更新」= 閲覧者の Geolocation を取得（擬似）
 *  - 「自宅を離れた通知」「帰宅通知」= 押すとトーストで動作イメージ
 */
import dynamic from "next/dynamic";
import { RefreshCw, Home, Footprints, LogOut, LogIn } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { DemoBanner } from "@/components/DemoBanner";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useGeofence } from "@/hooks/useGeofence";
import { useHydrated } from "@/hooks/useHydrated";
import { useToastStore } from "@/stores/toastStore";
import styles from "../family.module.css";

// Leaflet は window 依存のため SSR を無効化して読み込む
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => <div className={styles.loading}>地図を読み込み中…</div>,
});

export default function FamilyMapPage() {
  const hydrated = useHydrated();
  const {
    persons,
    selected,
    selectedId,
    selectPerson,
    refreshLocation,
    updating,
    error,
    locationSupported,
  } = useLocationSharing();
  const geo = useGeofence(selected);
  const showToast = useToastStore((s) => s.show);

  if (!hydrated) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>地図</h1>
        <p className={styles.loading}>よみこみ中…</p>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>地図・現在地</h1>

      <DemoBanner>
        「今すぐ更新」は、この端末（閲覧者）の位置情報を取得してデモ用に本人の現在地として表示します。実際の見守り端末の位置ではありません。
      </DemoBanner>

      {/* 対象者切り替え */}
      <div className={styles.personSelect}>
        {persons.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`${styles.personChip} ${
              p.id === selectedId ? styles.personChipActive : ""
            }`}
            onClick={() => selectPerson(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {selected && (
        <>
          <div className={styles.statusRow}>
            <span
              className={`${styles.statusBadge} ${
                geo.inside ? styles.badgeHome : styles.badgeAway
              }`}
            >
              {geo.inside ? <Home size={22} /> : <Footprints size={22} />}
              {geo.label}
            </span>
            {geo.distanceFromHome !== null && !geo.inside && (
              <span className={styles.metaRow}>
                自宅から約 {geo.distanceFromHome} m
              </span>
            )}
          </div>

          <MapView
            home={selected.geofence.center}
            radiusMeters={selected.geofence.radiusMeters}
            current={selected.current}
          />

          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => void refreshLocation(selected.id)}
            disabled={updating || !locationSupported}
          >
            <RefreshCw size={24} />
            {updating ? "取得中…" : "今すぐ更新"}
          </button>

          {!locationSupported && (
            <p className={styles.error}>
              この環境では位置情報が使えません。地図はモックの自宅位置を表示しています。
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}

          {/* 通知（Web では擬似トースト） */}
          <div className={styles.notifyRow}>
            <button
              type="button"
              className={styles.notifyBtn}
              onClick={() =>
                showToast(
                  `【動作イメージ】${selected.name}さんが自宅を離れました（外出通知）`,
                  "warning",
                )
              }
            >
              <LogOut size={22} /> 自宅を離れた通知
            </button>
            <button
              type="button"
              className={styles.notifyBtn}
              onClick={() =>
                showToast(
                  `【動作イメージ】${selected.name}さんが帰宅しました（帰宅通知）`,
                  "success",
                )
              }
            >
              <LogIn size={22} /> 帰宅通知
            </button>
          </div>
        </>
      )}

      <div className={styles.footer}>
        <BackButton href="/family" label="ダッシュボードに戻る" />
      </div>
    </main>
  );
}

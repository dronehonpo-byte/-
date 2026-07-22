/**
 * Zustand ストア: 見守り対象者と位置状態（機能②）。
 *
 * 現在地の更新・ジオフェンス判定を保持する。
 * UI からは `useLocationSharing` / `useGeofence` 経由で使う。
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { platformStateStorage } from "./persistStorage";
import { makeInitialWatchedPersons } from "@/lib/initialData";
import { isWithin } from "@/lib/geo";
import type {
  WatchedPerson,
  GeoPoint,
  LocationSample,
  PresenceStatus,
} from "@/types/location";

interface LocationStore {
  persons: WatchedPerson[];
  /** 地図・履歴で選択中の対象者 ID */
  selectedId: string | null;

  selectPerson: (id: string) => void;
  /** 対象者の現在地を更新し、ジオフェンスで在宅状態を再判定する */
  updateCurrent: (id: string, point: GeoPoint) => void;
  /** デモ用: 初期モックへ戻す */
  resetToMock: () => void;
}

function evaluateStatus(person: WatchedPerson, point: GeoPoint): PresenceStatus {
  return isWithin(point, person.geofence.center, person.geofence.radiusMeters)
    ? "home"
    : "away";
}

export const useLocationStore = create<LocationStore>()(
  persist(
    (set) => {
      const initial = makeInitialWatchedPersons();
      return {
        persons: initial,
        selectedId: initial[0]?.id ?? null,

        selectPerson: (id) => set({ selectedId: id }),

        updateCurrent: (id, point) =>
          set((s) => ({
            persons: s.persons.map((p) => {
              if (p.id !== id) return p;
              const sample: LocationSample = {
                ...point,
                timestamp: new Date().toISOString(),
              };
              return {
                ...p,
                current: sample,
                status: evaluateStatus(p, point),
              };
            }),
          })),

        resetToMock: () => {
          const fresh = makeInitialWatchedPersons();
          set({ persons: fresh, selectedId: fresh[0]?.id ?? null });
        },
      };
    },
    {
      name: "yorisoi.location",
      storage: createJSONStorage(() => platformStateStorage),
    },
  ),
);

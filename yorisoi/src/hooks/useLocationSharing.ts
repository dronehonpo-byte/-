"use client";
/**
 * 位置共有・見守り対象者一覧ロジック。
 *
 * locationStore と platform.location を束ねる。
 * 「今すぐ更新」= 閲覧者の Geolocation を取得し、選択中の対象者の
 * 現在地としてセットする（デモ用の擬似データ）。
 */
import { useCallback, useState } from "react";
import { location } from "@/lib/platform";
import { useLocationStore } from "@/stores/locationStore";

export function useLocationSharing() {
  const persons = useLocationStore((s) => s.persons);
  const selectedId = useLocationStore((s) => s.selectedId);
  const selectPerson = useLocationStore((s) => s.selectPerson);
  const updateCurrent = useLocationStore((s) => s.updateCurrent);
  const resetToMock = useLocationStore((s) => s.resetToMock);

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = persons.find((p) => p.id === selectedId) ?? persons[0] ?? null;

  /** 閲覧者の現在地を取得して対象者に反映（擬似） */
  const refreshLocation = useCallback(
    async (personId: string) => {
      setUpdating(true);
      setError(null);
      try {
        const point = await location.getCurrentPosition();
        updateCurrent(personId, point);
      } catch (e) {
        setError(e instanceof Error ? e.message : "位置情報の取得に失敗しました");
      } finally {
        setUpdating(false);
      }
    },
    [updateCurrent],
  );

  return {
    persons,
    selected,
    selectedId,
    selectPerson,
    refreshLocation,
    resetToMock,
    updating,
    error,
    locationSupported: location.isSupported(),
  };
}

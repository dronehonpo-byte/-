"use client";
/**
 * 家族モード 見守りダッシュボード（機能②）。
 * 対象者一覧（カード）＋地図・履歴への導線。
 */
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Map, History, Home as HomeIcon } from "lucide-react";
import { DemoBanner } from "@/components/DemoBanner";
import { PersonCard } from "@/components/PersonCard";
import { useLocationSharing } from "@/hooks/useLocationSharing";
import { useHydrated } from "@/hooks/useHydrated";
import styles from "./family.module.css";

export default function FamilyDashboardPage() {
  const router = useRouter();
  const { persons, selectPerson } = useLocationSharing();
  const hydrated = useHydrated();

  const openMap = (personId: string) => {
    selectPerson(personId);
    router.push("/family/map");
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>見守りダッシュボード</h1>
        <Link href="/" className={styles.homeLink} aria-label="最初に戻る">
          <HomeIcon size={24} />
        </Link>
      </header>

      <DemoBanner>
        Webデモ版のため、バックグラウンド位置取得・自宅離脱通知・帰宅通知は動作しません（iOS/Android版で対応）。
      </DemoBanner>

      <nav className={styles.quickNav}>
        <Link href="/family/map" className={styles.quickLink}>
          <Map size={28} /> 地図で見る
        </Link>
        <Link href="/family/history" className={styles.quickLink}>
          <History size={28} /> ルート履歴
        </Link>
      </nav>

      {!hydrated ? (
        <p className={styles.loading}>よみこみ中…</p>
      ) : (
        <div className={styles.cards}>
          {persons.map((p) => (
            <PersonCard key={p.id} person={p} onOpenMap={openMap} />
          ))}
        </div>
      )}
    </main>
  );
}

export const dynamic = "force-dynamic";

import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { computeStats } from "@/lib/stats";
import { interestLabels } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-sm text-neutral-500">{label}</div>
        <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
        {sub && <div className="mt-1 text-xs text-neutral-400">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const orgId = await getOrgId();
  const store = getStore();
  const [logs, leads] = await Promise.all([store.listCallLogs(orgId), store.listLeads(orgId)]);
  const stats = computeStats(logs);
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

  const interestEntries = (["high", "medium", "low", "none"] as const).map((k) => ({
    key: k,
    label: interestLabels[k],
    count: stats.interestDistribution[k] ?? 0,
  }));
  const interestMax = Math.max(1, ...interestEntries.map((e) => e.count));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatTile label="架電数" value={String(stats.totalCalls)} sub={`リード ${leads.length}件`} />
        <StatTile
          label="接続率"
          value={pct(stats.connectRate)}
          sub={`接続 ${stats.connectedCalls}件`}
        />
        <StatTile
          label="アポ率"
          value={pct(stats.appointmentRate)}
          sub={`アポ獲得 ${stats.appointments}件`}
        />
        <StatTile
          label="発信ブロック"
          value={String(stats.blockedByDnc + stats.blockedByHours)}
          sub={`DNC ${stats.blockedByDnc}件 / 時間帯 ${stats.blockedByHours}件`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>興味度分布</CardTitle>
          <CardDescription>架電結果に記録された興味度の内訳</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {interestEntries.map((e) => (
              <div key={e.key} className="flex items-center gap-3 text-sm">
                <div className="w-12 text-neutral-600">{e.label}</div>
                <div className="h-4 flex-1 overflow-hidden rounded-sm bg-neutral-100">
                  <div
                    className="h-full rounded-sm bg-neutral-700"
                    style={{ width: `${(e.count / interestMax) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-right tabular-nums text-neutral-600">{e.count}</div>
              </div>
            ))}
            {interestEntries.every((e) => e.count === 0) && (
              <p className="text-sm text-neutral-500">興味度が記録された通話はまだありません。</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

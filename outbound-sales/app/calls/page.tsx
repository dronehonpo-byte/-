export const dynamic = "force-dynamic";

import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { outcomeLabels, interestLabels } from "@/lib/labels";
import { recordResultAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CallOutcome } from "@/lib/types";

function outcomeVariant(outcome: CallOutcome) {
  switch (outcome) {
    case "appointment": return "success" as const;
    case "interested": return "default" as const;
    case "rejected": return "destructive" as const;
    case "blocked_dnc":
    case "blocked_hours": return "warning" as const;
    default: return "secondary" as const;
  }
}

export default async function CallsPage() {
  const orgId = await getOrgId();
  const store = getStore();
  const [logs, leads] = await Promise.all([store.listCallLogs(orgId), store.listLeads(orgId)]);
  const leadName = (id: string | null) =>
    id ? (leads.find((l) => l.id === id)?.company_name ?? "(削除済み)") : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">架電結果</h1>
        <p className="mt-1 text-sm text-neutral-500">
          結果を「拒否」で記録すると、その番号は自動的にDNCへ登録され再架電がブロックされます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>通話履歴({logs.length}件)</CardTitle>
          <CardDescription>録音同意・冒頭名乗りの実施状況も通話ごとに記録されます。</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>会社</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead>結果</TableHead>
                <TableHead>興味度</TableHead>
                <TableHead>遵守記録</TableHead>
                <TableHead>結果を記録</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-neutral-500">
                    通話履歴はまだありません(キャンペーンを実行すると記録されます)
                  </TableCell>
                </TableRow>
              )}
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-neutral-500">
                    {new Date(log.called_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                  </TableCell>
                  <TableCell className="font-medium">{leadName(log.lead_id)}</TableCell>
                  <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                  <TableCell>
                    <Badge variant={outcomeVariant(log.outcome)}>{outcomeLabels[log.outcome]}</Badge>
                    {log.dry_run && <span className="ml-1 text-xs text-neutral-400">(ドライラン)</span>}
                  </TableCell>
                  <TableCell>{log.interest_level ? interestLabels[log.interest_level] : "—"}</TableCell>
                  <TableCell className="text-xs text-neutral-500">
                    {log.disclosed_identity ? "名乗り済" : "名乗りなし"} /{" "}
                    {log.recording_consent ? "録音告知済" : "録音なし"}
                  </TableCell>
                  <TableCell>
                    {log.outcome === "blocked_dnc" || log.outcome === "blocked_hours" ? (
                      <span className="text-xs text-neutral-400">発信ブロック済み</span>
                    ) : (
                      <form action={recordResultAction.bind(null, log.id)} className="flex flex-wrap items-center gap-1">
                        <Select name="outcome" defaultValue={log.dry_run ? "" : log.outcome} required className="h-8 w-28 text-xs">
                          <option value="">結果...</option>
                          <option value="appointment">アポ獲得</option>
                          <option value="interested">興味あり</option>
                          <option value="rejected">拒否</option>
                          <option value="no_answer">不在</option>
                        </Select>
                        <Select name="interest_level" defaultValue={log.interest_level ?? ""} className="h-8 w-20 text-xs">
                          <option value="">興味度</option>
                          <option value="high">高</option>
                          <option value="medium">中</option>
                          <option value="low">低</option>
                          <option value="none">なし</option>
                        </Select>
                        <Input name="memo" placeholder="メモ" defaultValue={log.memo ?? ""} className="h-8 w-32 text-xs" />
                        <Button type="submit" size="sm" variant="outline" className="h-8">保存</Button>
                      </form>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

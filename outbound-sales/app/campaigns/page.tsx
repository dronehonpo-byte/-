export const dynamic = "force-dynamic";

import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { campaignStatusLabels } from "@/lib/labels";
import { isVoiceConfigured } from "@/lib/voice/grok";
import { createCampaignAction, deleteCampaignAction, runCampaignAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CampaignsPage() {
  const orgId = await getOrgId();
  const store = getStore();
  const [campaigns, scenarios, leads] = await Promise.all([
    store.listCampaigns(orgId),
    store.listScenarios(orgId),
    store.listLeads(orgId),
  ]);
  const scenarioName = (id: string) => scenarios.find((s) => s.id === id)?.name ?? "(削除済み)";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">発信キャンペーン</h1>
        <p className="mt-1 text-sm text-neutral-500">
          誰に・いつ・どのシナリオで架電するかを管理します。
          {!isVoiceConfigured() && "(現在SIP未設定のため、実行は常にドライラン=実発信なし)"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>キャンペーンを作成</CardTitle>
          <CardDescription>
            {scenarios.length === 0 && "先にトークシナリオを作成してください。"}
            {leads.length === 0 && " 架電先リードが必要です。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCampaignAction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">キャンペーン名 *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="scenario_id">シナリオ *</Label>
                <Select id="scenario_id" name="scenario_id" required>
                  <option value="">選択してください</option>
                  {scenarios.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}(商材: {s.product_name})</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="scheduled_at">開始予定日時(空欄で下書き)</Label>
                <Input id="scheduled_at" name="scheduled_at" type="datetime-local" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>架電対象リード *</Label>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-3">
                {leads.length === 0 && <p className="text-sm text-neutral-500">リードがありません</p>}
                {leads.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="lead_ids" value={l.id} className="h-4 w-4" />
                    <span className="font-medium">{l.company_name}</span>
                    <span className="font-mono text-xs text-neutral-500">{l.phone}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={scenarios.length === 0 || leads.length === 0}>作成</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>キャンペーン一覧({campaigns.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>シナリオ</TableHead>
                <TableHead>対象件数</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>開始予定</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-neutral-500">
                    キャンペーンがまだありません
                  </TableCell>
                </TableRow>
              )}
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{scenarioName(c.scenario_id)}</TableCell>
                  <TableCell>{c.lead_ids.length}件</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        c.status === "completed" ? "success" : c.status === "running" ? "warning" : "secondary"
                      }
                    >
                      {campaignStatusLabels[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {c.scheduled_at
                      ? new Date(c.scheduled_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <form action={runCampaignAction.bind(null, c.id)}>
                        <Button type="submit" size="sm" variant="outline">
                          {isVoiceConfigured() ? "発信実行" : "ドライラン実行"}
                        </Button>
                      </form>
                      <form action={deleteCampaignAction.bind(null, c.id)}>
                        <Button type="submit" variant="ghost" size="sm">削除</Button>
                      </form>
                    </div>
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

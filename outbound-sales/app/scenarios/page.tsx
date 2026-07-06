export const dynamic = "force-dynamic";

import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { buildMandatoryOpening } from "@/lib/compliance";
import { createScenarioAction, deleteScenarioAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function ScenariosPage() {
  const orgId = await getOrgId();
  const scenarios = await getStore().listScenarios(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">営業トークシナリオ</h1>
        <p className="mt-1 text-sm text-neutral-500">
          事業者名と通話目的は、通話冒頭の名乗りスクリプトとしてAIに強制されます(特定商取引法対応)。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>シナリオを作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createScenarioAction} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="name">シナリオ名 *</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="product_name">商材名 *</Label>
                <Input id="product_name" name="product_name" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="business_name">事業者名(冒頭名乗り) *</Label>
                <Input id="business_name" name="business_name" placeholder="株式会社〇〇" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="purpose">通話の目的(冒頭で告知) *</Label>
                <Input id="purpose" name="purpose" placeholder="例: 新サービスのご提案" required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="talk_flow">トークフロー</Label>
              <Textarea
                id="talk_flow"
                name="talk_flow"
                rows={5}
                placeholder="1. 冒頭名乗り(自動挿入)&#10;2. 課題ヒアリング&#10;3. 商材のメリット提示&#10;4. アポ打診(候補日時を2つ提示)"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="objection_handling">切り返し(想定問答)</Label>
              <Textarea
                id="objection_handling"
                name="objection_handling"
                rows={5}
                placeholder="Q: 今忙しい → A: 2分だけお時間をいただけますか。難しければ改めてご都合の良い時間に…&#10;Q: 不要です → (即時に勧誘を中止して謝罪・終了 ※システム強制)"
              />
            </div>
            <Button type="submit">作成</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {scenarios.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{s.name}</CardTitle>
                  <CardDescription>商材: {s.product_name} / 事業者名: {s.business_name}</CardDescription>
                </div>
                <form action={deleteScenarioAction.bind(null, s.id)}>
                  <Button type="submit" variant="ghost" size="sm">削除</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="mb-1 font-medium text-neutral-700">冒頭名乗りスクリプト(自動生成・変更不可)</div>
                <pre className="whitespace-pre-wrap rounded-md bg-neutral-100 p-3 text-xs text-neutral-700">
                  {buildMandatoryOpening(s)}
                </pre>
              </div>
              <Separator />
              <div className="grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="mb-1 font-medium text-neutral-700">トークフロー</div>
                  <p className="whitespace-pre-wrap text-neutral-600">{s.talk_flow || "未設定"}</p>
                </div>
                <div>
                  <div className="mb-1 font-medium text-neutral-700">切り返し</div>
                  <p className="whitespace-pre-wrap text-neutral-600">{s.objection_handling || "未設定"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {scenarios.length === 0 && (
          <p className="text-sm text-neutral-500">シナリオがまだありません。</p>
        )}
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { addDncAction, removeDncAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const sourceLabels = { manual: "手動登録", call_result: "架電結果から自動", import: "インポート" } as const;

export default async function DncPage() {
  const orgId = await getOrgId();
  const entries = await getStore().listDnc(orgId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">拒否リスト(DNC: Do Not Call)</h1>
        <p className="mt-1 text-sm text-neutral-500">
          登録された番号への発信はシステムが自動的にブロックします。架電結果で「拒否」を記録した番号も自動で追加されます。
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>番号を登録</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addDncAction} className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="phone">電話番号 *</Label>
              <Input id="phone" name="phone" placeholder="03-1234-5678" required className="w-56" />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="reason">理由</Label>
              <Input id="reason" name="reason" placeholder="例: 電話にて勧誘停止のご要望" />
            </div>
            <Button type="submit">DNCに登録</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>登録済み番号({entries.length}件)</CardTitle>
          <CardDescription>
            解除は誤登録の訂正のみに使用してください。勧誘拒否の意思を示した相手への再勧誘は特定商取引法で禁止されています。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>電話番号</TableHead>
                <TableHead>理由</TableHead>
                <TableHead>登録元</TableHead>
                <TableHead>登録日時</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-neutral-500">
                    登録された番号はありません
                  </TableCell>
                </TableRow>
              )}
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.phone}</TableCell>
                  <TableCell>{e.reason ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={e.source === "call_result" ? "warning" : "secondary"}>
                      {sourceLabels[e.source]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-neutral-500">
                    {new Date(e.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}
                  </TableCell>
                  <TableCell>
                    <form action={removeDncAction.bind(null, e.id)}>
                      <Button type="submit" variant="ghost" size="sm">解除</Button>
                    </form>
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

export const dynamic = "force-dynamic";

import { getStore } from "@/lib/store";
import { getOrgId } from "@/lib/tenant";
import { leadStatusLabels } from "@/lib/labels";
import { createLeadAction, deleteLeadAction, importCsvAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function LeadsPage() {
  const orgId = await getOrgId();
  const leads = await getStore().listLeads(orgId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">営業リスト</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>架電先を追加</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createLeadAction} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="company_name">会社名 *</Label>
                  <Input id="company_name" name="company_name" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="contact_name">担当者名</Label>
                  <Input id="contact_name" name="contact_name" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">電話番号 *</Label>
                  <Input id="phone" name="phone" placeholder="03-1234-5678" required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">メール</Label>
                  <Input id="email" name="email" type="email" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">メモ</Label>
                <Input id="notes" name="notes" />
              </div>
              <Button type="submit">追加</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CSVインポート</CardTitle>
            <CardDescription>
              列順: 会社名, 担当者, 電話番号, メール, メモ(ヘッダ行は自動スキップ)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={importCsvAction} className="space-y-3">
              <Input type="file" name="file" accept=".csv,text/csv" required />
              <Button type="submit" variant="secondary">インポート</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>架電先一覧({leads.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>会社名</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>電話番号</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-neutral-500">
                    架電先がまだありません
                  </TableCell>
                </TableRow>
              )}
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium">{lead.company_name}</TableCell>
                  <TableCell>{lead.contact_name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{lead.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        lead.status === "appointment"
                          ? "success"
                          : lead.status === "rejected" || lead.status === "dnc"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {leadStatusLabels[lead.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48 truncate text-neutral-500">{lead.notes ?? ""}</TableCell>
                  <TableCell>
                    <form action={deleteLeadAction.bind(null, lead.id)}>
                      <Button type="submit" variant="ghost" size="sm">削除</Button>
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

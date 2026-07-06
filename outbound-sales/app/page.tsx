export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ダッシュボード</h1>
      <Card>
        <CardHeader>
          <CardTitle>セットアップ完了</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">
          プロジェクト基盤の構築が完了しました。左のメニューから各機能へ移動できます。
        </CardContent>
      </Card>
    </div>
  );
}

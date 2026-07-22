import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function CallLogsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="通話ログ"
        description="過去の着信・応答履歴と文字起こしを検索・確認できます。"
      />
      <div className="p-8">
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            通話ログはまだありません。着信が発生するとここに一覧表示されます。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

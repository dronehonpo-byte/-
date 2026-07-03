import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function AgentsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="エージェント"
        description="AI エージェントの作成・プロンプト設定・稼働管理を行います。"
      />
      <div className="p-8">
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            エージェントが登録されていません。最初の AI エージェントを作成してください。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

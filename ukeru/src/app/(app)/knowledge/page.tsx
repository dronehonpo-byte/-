import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function KnowledgePage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="ナレッジ"
        description="AI が応答に利用する FAQ・マニュアル・社内ナレッジを管理します。"
      />
      <div className="p-8">
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            ナレッジがまだ登録されていません。ドキュメントをアップロードして学習させましょう。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

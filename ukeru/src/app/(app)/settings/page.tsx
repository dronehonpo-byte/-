import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="設定"
        description="ワークスペース・通知・連携（Slack など）・請求の設定を行います。"
      />
      <div className="p-8">
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            設定項目はここに表示されます。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

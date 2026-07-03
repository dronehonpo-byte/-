import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function PhoneNumbersPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="電話番号"
        description="発着信に利用する電話番号の購入・割り当て・ルーティングを管理します。"
      />
      <div className="p-8">
        <Card>
          <CardContent className="text-muted-foreground py-16 text-center text-sm">
            電話番号が割り当てられていません。新しい番号を取得してエージェントに紐付けてください。
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

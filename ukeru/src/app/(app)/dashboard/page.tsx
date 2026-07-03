import { PhoneCall, Bot, Clock, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { CallVolumeChart } from "@/components/call-volume-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const stats = [
  {
    label: "本日の着信数",
    value: "1,284",
    delta: "+12.5%",
    icon: PhoneCall,
  },
  {
    label: "AI応答率",
    value: "78.3%",
    delta: "+4.1%",
    icon: Bot,
  },
  {
    label: "平均応答時間",
    value: "42秒",
    delta: "-8.0%",
    icon: Clock,
  },
  {
    label: "解決率",
    value: "91.2%",
    delta: "+2.3%",
    icon: TrendingUp,
  },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="ダッシュボード"
        description="コールセンター全体の稼働状況をリアルタイムで確認できます。"
      />

      <div className="space-y-6 p-8">
        {/* 統計カード */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardHeader>
                  <CardDescription>{stat.label}</CardDescription>
                  <CardTitle className="text-3xl">{stat.value}</CardTitle>
                  <span className="text-brand-gold text-sm font-medium">
                    {stat.delta}
                  </span>
                </CardHeader>
                <CardContent className="text-brand-navy dark:text-brand-gold">
                  <Icon className="size-6 opacity-70" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 着信ボリューム推移 */}
        <Card>
          <CardHeader>
            <CardTitle>週間着信ボリューム</CardTitle>
            <CardDescription>
              総着信数と AI が自動応答した件数の推移
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CallVolumeChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

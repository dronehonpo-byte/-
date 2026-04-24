import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/legal-layout";
import { company } from "@/lib/config";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "KUHAKU（株式会社Miyabee）の特定商取引法に基づく表記。",
  alternates: { canonical: "/legal/specified-commercial-transactions" },
};

const rows: { label: string; value: React.ReactNode }[] = [
  { label: "販売事業者名", value: company.name },
  {
    label: "所在地",
    value: `〒${company.postal} ${company.address}`,
  },
  {
    label: "電話番号",
    value: (
      <a
        href={`tel:${company.tel.replace(/-/g, "")}`}
        className="underline underline-offset-4 hover:text-gold"
      >
        {company.tel}
      </a>
    ),
  },
  {
    label: "メールアドレス",
    value: (
      <a
        href={`mailto:${company.email}`}
        className="underline underline-offset-4 hover:text-gold"
      >
        {company.email}
      </a>
    ),
  },
  {
    label: "運営サービス",
    value: "KUHAKU（AIコンサルティング／業務自動化支援）",
  },
  {
    label: "販売価格",
    value: "各サービスページに記載の金額（税込）／API利用料（実費・顧客負担）が別途発生",
  },
  {
    label: "商品代金以外の必要料金",
    value: "銀行振込手数料（お客様負担）／API利用料（概算を契約前に提示）",
  },
  { label: "お支払い方法", value: "銀行振込のみ（株式会社Miyabee法人口座）" },
  {
    label: "お支払い時期",
    value:
      "着手時：契約後7日以内に料金の50%／完了時：完了確認後7日以内に残金50%",
  },
  {
    label: "商品の引渡し時期",
    value:
      "ライト：最短7-10営業日／スタンダード：最短10-14営業日／プロ：最短14-18営業日",
  },
  {
    label: "返品・返金について",
    value:
      "完了基準未達の場合、着手金を全額返金（14営業日以内に振込）。顧客都合の解約・運用条件未準備・仕様変更による遅延・不可抗力は返金対象外。",
  },
  {
    label: "解約について",
    value:
      "開発着手前のお客様都合解約は着手金返金対象外。当社都合（技術的実現不可など）の解約は全額返金。",
  },
  {
    label: "動作環境",
    value:
      "Google Workspace、Microsoft 365、またはウェブブラウザ環境での動作を想定。必要な動作環境は契約前に個別合意。",
  },
];

export default function TokushoPage() {
  return (
    <LegalLayout
      title="特定商取引法に基づく表記"
      updated="2026年4月24日"
      leadIn="特定商取引に関する法律第11条に基づく表記です。"
    >
      <dl className="divide-y divide-navy/10">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid md:grid-cols-[10rem_1fr] gap-1 md:gap-6 py-4 md:py-5 first:pt-0 last:pb-0"
          >
            <dt className="text-xs md:text-sm font-bold tracking-wider text-navy/60 uppercase">
              {r.label}
            </dt>
            <dd className="text-sm md:text-base text-navy/85 leading-relaxed">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </LegalLayout>
  );
}

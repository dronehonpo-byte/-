import type { Metadata } from "next";
import { LegalLayout, Article } from "@/components/legal/legal-layout";
import { company } from "@/lib/config";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "KUHAKU（株式会社Miyabee）のプライバシーポリシー。個人情報の取り扱いについて。",
  alternates: { canonical: "/legal/privacy-policy" },
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="プライバシーポリシー"
      updated="2026年4月24日"
      leadIn={
        <>
          {company.name}（以下「当社」といいます）は、お客様の個人情報の保護を重要視し、個人情報の保護に関する法律（個人情報保護法）を遵守するとともに、以下のプライバシーポリシー（以下「本ポリシー」といいます）に基づき、お客様の個人情報を適切に取り扱います。
        </>
      }
    >
      <Article num="1" title="事業者情報">
        <p>
          {company.name}／{company.address}
        </p>
      </Article>

      <Article num="2" title="個人情報の定義">
        <p>
          本ポリシーにおける「個人情報」とは、個人情報保護法に定める「個人情報」を指し、生存する個人に関する情報であって、氏名、生年月日、住所、電話番号、メールアドレス、その他の記述等により特定の個人を識別できる情報を指します。
        </p>
      </Article>

      <Article num="3" title="取得する個人情報">
        <p>当社は以下の方法で個人情報を取得します。</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>
            お問い合わせフォーム、LINE公式アカウント、無料相談予約システム等を通じて入力された情報（氏名、会社名、役職、メールアドレス、電話番号、LINE ID、LINE表示名、お問い合わせ内容）
          </li>
          <li>
            AI診断ページにおける入力情報（従業員数、業務内容、業務時間などの自社情報、診断結果の履歴）
          </li>
          <li>
            契約締結時にいただく情報（法人情報、代表者氏名、請求先情報等）
          </li>
          <li>
            Cookie、アクセスログ、IPアドレス等、当社ウェブサイトの利用状況に関する情報
          </li>
        </ol>
      </Article>

      <Article num="4" title="個人情報の利用目的">
        <p>当社は取得した個人情報を以下の目的で利用します。</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>お問い合わせ・ご相談への対応</li>
          <li>サービスのご提供、契約の履行</li>
          <li>サービスに関する情報提供、営業活動</li>
          <li>メールマガジン、LINE配信等の情報発信</li>
          <li>サービス改善・新サービスの開発</li>
          <li>利用状況の分析、マーケティング</li>
          <li>請求・決済処理</li>
          <li>法令に基づく対応</li>
        </ol>
      </Article>

      <Article num="5" title="個人情報の第三者提供">
        <p>
          当社は、お客様の同意を得ずに個人情報を第三者に提供することはありません。ただし、法令に基づく場合、人の生命・身体・財産の保護のために必要がある場合等を除きます。なお、サービス提供のために必要な範囲で、業務委託先（決済代行、クラウドサービス提供者等）に個人情報の取り扱いを委託する場合があります。この場合、当社は委託先に対して適切な監督を行います。
        </p>
      </Article>

      <Article num="6" title="個人情報の安全管理措置">
        <p>
          当社は、個人情報の漏洩、滅失または毀損の防止、その他個人情報の安全管理のために、以下の措置を講じます。
        </p>
        <ol className="list-decimal pl-6 space-y-1">
          <li>個人情報へのアクセス権限の適切な管理</li>
          <li>通信の暗号化（SSL/TLS）</li>
          <li>バックアップの実施と安全な保管</li>
          <li>従業員への教育・研修</li>
          <li>委託先の適切な選定と監督</li>
        </ol>
      </Article>

      <Article num="7" title="個人情報の開示・訂正・削除">
        <p>
          お客様は、当社が保有するご自身の個人情報について、開示、訂正、追加、削除、利用停止を請求することができます。ご請求は第11条のお問い合わせ窓口までご連絡ください。当社は、法令に従い速やかに対応いたします。
        </p>
      </Article>

      <Article num="8" title="Cookieおよびアクセス解析ツールの使用">
        <ol className="list-decimal pl-6 space-y-1">
          <li>
            当社ウェブサイトでは、お客様の利便性向上のためCookieを使用する場合があります。Cookieはお客様のブラウザ設定で無効にすることができます。
          </li>
          <li>
            当社はサービス改善のためGoogle Analyticsを使用しています。データは匿名で収集されています。データ収集を無効にしたい場合は、Googleが提供するオプトアウトアドオンをご利用ください。
          </li>
          <li>
            当社ウェブサイトでは、第三者配信の広告サービスを利用する場合があります。当該広告配信事業者は、Cookie等を利用してお客様のアクセス情報を取得することがあります。
          </li>
        </ol>
      </Article>

      <Article num="9" title="未成年者の個人情報">
        <p>
          未成年者の方は、保護者の同意を得たうえで、当社サービスをご利用ください。
        </p>
      </Article>

      <Article num="10" title="プライバシーポリシーの変更">
        <p>
          当社は、法令の改正やサービスの変更等に伴い、本ポリシーを変更することがあります。変更後のポリシーは、当社ウェブサイトに掲載した時点で効力を生じるものとします。
        </p>
      </Article>

      <Article num="11" title="お問い合わせ窓口">
        <p>
          本ポリシーに関するお問い合わせは、以下の窓口までお願いいたします。
        </p>
        <p className="pl-4 border-l-2 border-gold/40">
          {company.name}
          <br />
          {company.address}
          <br />
          電話：
          <a href={`tel:${company.tel.replace(/-/g, "")}`} className="hover:text-gold underline underline-offset-4">
            {company.tel}
          </a>
          <br />
          メール：
          <a href={`mailto:${company.email}`} className="hover:text-gold underline underline-offset-4">
            {company.email}
          </a>
        </p>
      </Article>

      <div className="mt-10 pt-6 border-t border-navy/10 text-sm text-navy/70">
        <p>附則　本ポリシーは、2026年4月24日から施行します。</p>
      </div>
    </LegalLayout>
  );
}

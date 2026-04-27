import Link from "next/link";
import { company } from "@/lib/config";

const legalLinks = [
  { href: "/legal/terms", label: "利用規約" },
  {
    href: "/legal/specified-commercial-transactions",
    label: "特定商取引法に基づく表記",
  },
  { href: "/legal/privacy-policy", label: "プライバシーポリシー" },
];

export function Footer() {
  return (
    <footer className="bg-navy text-white/90 pb-floating">
      <div className="container py-16 md:py-20 grid gap-10 md:grid-cols-3">
        <div className="space-y-4">
          <div className="font-en text-2xl tracking-[0.22em] font-bold">
            <span className="text-gold">●</span> KUHAKU
          </div>
          <p className="text-sm leading-relaxed opacity-80">
            あなたの会社に、AI社員を。<br />
            中小企業のAI業務代行サービス。
          </p>
        </div>

        <div className="text-sm leading-relaxed space-y-2">
          <div className="text-xs tracking-[0.2em] uppercase text-gold mb-3">
            Company
          </div>
          <div className="font-bold">{company.name}</div>
          <div>〒{company.postal}</div>
          <div>{company.address}</div>
          <div>TEL: <a href={`tel:${company.tel.replace(/-/g, "")}`} className="hover:text-gold">{company.tel}</a></div>
          <div>MAIL: <a href={`mailto:${company.email}`} className="hover:text-gold">{company.email}</a></div>
        </div>

        <div className="text-sm space-y-2">
          <div className="text-xs tracking-[0.2em] uppercase text-gold mb-3">
            Legal
          </div>
          <ul className="space-y-2">
            {legalLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="hover:text-gold underline-offset-4 hover:underline"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-xs opacity-70">
          <div>© {new Date().getFullYear()} {company.name}. All rights reserved.</div>
          <div className="font-en tracking-widest">KUHAKU by Miyabee</div>
        </div>
      </div>
    </footer>
  );
}

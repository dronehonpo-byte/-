import { ButtonLink } from "../ui/button";
import { ctaLinks } from "@/lib/config";

export function Hero() {
  return (
    <section className="relative bg-white pt-24 md:pt-28 pb-16 md:pb-24 border-b border-ink/8">
      <div className="container">
        <div className="grid gap-12 lg:gap-12 lg:grid-cols-12 items-center">
          {/* Left: copy + CTA */}
          <div className="lg:col-span-7">
            <p className="text-[11px] md:text-xs font-bold tracking-[0.22em] text-navy uppercase">
              AI × 業務自動化 for SMB
            </p>

            <h1 className="heading-xl mt-5 text-[40px] leading-[1.12] md:text-[64px] lg:text-[76px] lg:leading-[1.05] text-ink">
              月<span className="text-accent">40時間</span>を、
              <br />
              AIが返します。
            </h1>

            <p className="mt-7 md:mt-8 text-jp text-sm md:text-base text-ink/75 max-w-xl">
              社長がやるべきでない業務を、AIで自動化。
              削減時間を事前に約束し、達成できなければ
              <span className="font-bold text-ink">全額返金</span>します。
            </p>

            {/* CTA with speech bubble */}
            <div className="mt-10 md:mt-12">
              <SpeechBubbleCta
                href={ctaLinks.diagnosis}
                label="無料・30秒で完了"
                gaName="hero_diagnosis"
              >
                あなたの会社、月何時間削減できる？
              </SpeechBubbleCta>

              <div className="mt-5 flex flex-col sm:flex-row gap-x-6 gap-y-2 text-sm">
                <a
                  href={ctaLinks.line}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ga="hero_line"
                  className="font-bold text-ink/75 hover:text-ink underline underline-offset-4 decoration-ink/20 hover:decoration-accent transition"
                >
                  LINE登録で特典を受け取る
                </a>
                <a
                  href={ctaLinks.timerex}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-ga="hero_timerex"
                  className="font-bold text-ink/75 hover:text-ink underline underline-offset-4 decoration-ink/20 hover:decoration-accent transition"
                >
                  無料面談を予約（TimeRex）
                </a>
              </div>
            </div>
          </div>

          {/* Right: dashboard mock */}
          <div className="lg:col-span-5">
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}

function SpeechBubbleCta({
  href,
  label,
  gaName,
  children,
}: {
  href: string;
  label: string;
  gaName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative inline-block w-full sm:w-auto">
      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full bg-ink text-white text-[10px] md:text-xs font-bold px-3 py-1 whitespace-nowrap shadow-lift">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        {label}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 -bottom-1 h-2 w-2 rotate-45 bg-ink"
        />
      </span>
      <ButtonLink
        href={href}
        variant="primary"
        size="xl"
        data-ga={gaName}
        className="w-full sm:w-auto"
      >
        {children}
      </ButtonLink>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="relative">
      <div className="rounded-2xl bg-white border border-ink/10 shadow-card overflow-hidden">
        {/* App chrome */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink/8 bg-paper">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink/15" />
          </div>
          <div className="flex-1 mx-3 h-5 rounded bg-white border border-ink/10" />
        </div>

        <div className="grid grid-cols-12">
          {/* Sidebar */}
          <aside className="col-span-3 border-r border-ink/8 bg-paper p-3 space-y-1">
            {[
              { label: "ダッシュボード", active: true },
              { label: "タスク" },
              { label: "メール" },
              { label: "レポート" },
              { label: "設定" },
            ].map((item) => (
              <div
                key={item.label}
                className={`text-[10px] px-2 py-1.5 rounded font-medium ${
                  item.active ? "bg-navy text-white" : "text-ink/60"
                }`}
              >
                {item.label}
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="col-span-9 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "削減時間", value: "42h", delta: "+12%", accent: true },
                { label: "完了タスク", value: "187", delta: "+8%" },
                { label: "稼働率", value: "94%", delta: "+3%" },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-lg border border-ink/10 bg-white p-2.5"
                >
                  <div className="text-[8px] text-ink/50 font-bold tracking-wider uppercase">
                    {kpi.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-en text-lg font-bold text-ink">
                      {kpi.value}
                    </span>
                    <span
                      className={`text-[8px] font-bold ${
                        kpi.accent ? "text-accent" : "text-navy"
                      }`}
                    >
                      {kpi.delta}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-ink/10 bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-ink">
                  月次削減時間
                </div>
                <div className="text-[8px] text-ink/50">直近6ヶ月</div>
              </div>
              <svg viewBox="0 0 240 80" className="w-full h-auto">
                <defs>
                  <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2B4FD4" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#2B4FD4" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[20, 40, 60].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    y1={y}
                    x2="240"
                    y2={y}
                    stroke="#0F1A3A"
                    strokeOpacity="0.05"
                  />
                ))}
                <path
                  d="M0,62 L40,54 L80,48 L120,38 L160,28 L200,18 L240,10 L240,80 L0,80 Z"
                  fill="url(#heroChartFill)"
                />
                <path
                  d="M0,62 L40,54 L80,48 L120,38 L160,28 L200,18 L240,10"
                  fill="none"
                  stroke="#2B4FD4"
                  strokeWidth="2"
                />
                <circle cx="240" cy="10" r="3" fill="#FF6B4A" />
              </svg>
            </div>

            <div className="rounded-lg border border-ink/10 bg-white">
              <div className="px-3 py-2 border-b border-ink/8 text-[10px] font-bold text-ink">
                自動化中のタスク
              </div>
              <ul className="divide-y divide-ink/5">
                {[
                  { name: "メール自動振り分け", status: "実行中", running: true },
                  { name: "議事録の要約生成", status: "完了", running: false },
                  { name: "売上レポート集計", status: "実行中", running: true },
                ].map((task) => (
                  <li
                    key={task.name}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <span className="flex items-center gap-2 text-[10px] text-ink/80">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          task.running ? "bg-accent" : "bg-navy"
                        }`}
                      />
                      {task.name}
                    </span>
                    <span className="text-[8px] font-bold text-ink/50 uppercase tracking-wider">
                      {task.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Floating phone mock */}
      <div className="hidden md:block absolute -bottom-8 -left-6 w-36 rounded-2xl border border-ink/10 bg-white shadow-card overflow-hidden">
        <div className="bg-navy px-3 py-2 text-white text-[9px] font-bold flex items-center justify-between">
          <span className="tracking-wider">KUHAKU</span>
          <span className="opacity-60">9:41</span>
        </div>
        <div className="p-2 space-y-1.5">
          <div className="rounded bg-paper p-1.5">
            <div className="text-[7px] font-bold text-ink/60 uppercase tracking-wider">
              通知
            </div>
            <div className="text-[9px] text-ink mt-0.5">本日 3件のレポート完成</div>
          </div>
          <div className="rounded bg-accent/10 border border-accent/20 p-1.5">
            <div className="text-[7px] font-bold text-accent uppercase tracking-wider">
              今月
            </div>
            <div className="text-[10px] text-ink mt-0.5 font-bold">
              42時間削減 ↑
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

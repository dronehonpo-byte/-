import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";

export function FounderMessage() {
  return (
    <Section
      id="founder"
      tone="white"
      eyebrow="Founder Message"
      heading="なぜ、このサービスを始めたか。"
    >
      <Reveal>
        <div className="mx-auto max-w-3xl">
          <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-12 items-start">
            {/* Avatar */}
            <div className="mx-auto md:mx-0">
              <div className="h-32 w-32 md:h-44 md:w-44 rounded-full bg-navy text-white flex items-center justify-center font-en text-3xl md:text-5xl font-bold">
                MS
              </div>
              <div className="mt-4 text-center md:text-left">
                <div className="font-bold text-ink">MASAKI</div>
                <div className="text-xs text-ink/60 mt-1">
                  株式会社Miyabee 代表取締役
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="text-jp text-sm md:text-base text-ink/85 leading-loose space-y-5">
              <p>
                私は今年で20歳、慶應義塾大学の在学生です。
                18歳で株式会社Miyabeeを設立し、ドローン事業から始まり、
                動画制作、そしてAI実装へと事業を広げてきました。
              </p>
              <p>
                様々な中小企業のお手伝いをするなかで気づいたのは、
                <strong className="font-bold text-ink">
                  どの社長も「自分がやらなくていいはずの仕事」に時間を奪われている
                </strong>
                、という事実でした。メール、議事録、レポート、見積もり、領収書整理。
                これらは社長の判断や決断とは別の、誰かに任せられる作業です。
              </p>
              <p>
                KUHAKU は、この「社長がやらなくていい仕事」を AI に巻き取らせる
                サービスです。実績の数では大手にかないません。
                だから「成果が出なければ全額返金」を契約条項に入れました。
                <strong className="font-bold text-ink">
                  先に時間を取り戻してください。料金は、そのあとで結構です。
                </strong>
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}

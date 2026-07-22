"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Phone, Mail, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Section } from "../ui/section";
import { Reveal } from "../ui/reveal";
import { ctaLinks, phoneHours, company } from "@/lib/config";
import { cn } from "@/lib/utils";

type FormState = {
  name: string;
  companyName: string;
  email: string;
  phone: string;
  message: string;
  /** Honeypot：bot対策。表示せず常に空のまま送信 */
  website: string;
};

type Status =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const initial: FormState = {
  name: "",
  companyName: "",
  email: "",
  phone: "",
  message: "",
  website: "",
};

export function Contact() {
  return (
    <Section
      id="contact"
      tone="paper"
      eyebrow="Contact"
      heading="お問い合わせ"
      lead="お電話・メールフォームからもご相談を承っています。お急ぎの方はお電話を、テキストで相談したい方はフォームをご利用ください。"
    >
      <div className="grid gap-6 md:gap-8 md:grid-cols-2">
        <Reveal>
          <PhoneCard />
        </Reveal>
        <Reveal delay={0.1}>
          <FormCard />
        </Reveal>
      </div>

      {/* CTA への動線維持の念押し（既存3CTAは温存） */}
      <p className="mt-10 md:mt-14 text-center text-xs md:text-sm text-ink/60">
        日程を直接決めたい方は{" "}
        <a
          href={ctaLinks.timerex}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-vermilion underline underline-offset-4 hover:text-vermilion-600"
        >
          TimeRex で30分の無料相談
        </a>
        ／LINE で資料受け取りは{" "}
        <a
          href={ctaLinks.line}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-[#06C755] underline underline-offset-4 hover:brightness-90"
        >
          LINE登録
        </a>
        へ。
      </p>
    </Section>
  );
}

function PhoneCard() {
  return (
    <article className="relative overflow-hidden rounded-3xl bg-navy text-white p-7 md:p-10 shadow-[0_30px_80px_-30px_rgba(15,26,58,0.6)] h-full flex flex-col">
      <div
        className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-vermilion/30 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] md:text-xs font-bold tracking-widest uppercase">
          <Phone size={12} /> お電話で相談
        </div>
        <h3 className="mt-4 text-lg md:text-xl font-bold">
          すぐに話したい方は、こちら。
        </h3>
        <p className="mt-2 text-xs md:text-sm text-white/70 leading-relaxed">
          ヒアリングから業務の優先順位整理まで、お電話でも対応いたします。
          営業のお電話はお断りしています。
        </p>

        <a
          href={ctaLinks.telLink}
          data-ga="contact_tel"
          className="mt-7 md:mt-8 group block rounded-2xl bg-white text-navy px-5 py-5 md:py-6 hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.5)] transition"
        >
          <div className="text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase text-vermilion">
            TEL
          </div>
          <div className="mt-1 font-en font-bold text-3xl md:text-5xl tracking-tight text-navy group-hover:text-vermilion transition">
            {ctaLinks.tel}
          </div>
          <div className="mt-2 text-xs md:text-sm text-ink/70">
            受付：{phoneHours}
          </div>
        </a>

        <p className="mt-5 text-[11px] text-white/55 leading-relaxed">
          ※ スマートフォンの場合はタップでそのまま発信できます。
          会議中・対応中の場合は留守番電話にお名前とご用件をお願いします。
        </p>
      </div>
    </article>
  );
}

function FormCard() {
  const [state, setState] = React.useState<FormState>(initial);
  const [status, setStatus] = React.useState<Status>({ kind: "idle" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const update =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setState((s) => ({ ...s, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setStatus({ kind: "submitting" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = (await res.json()) as {
        ok: boolean;
        errors?: Record<string, string>;
        error?: string;
      };

      if (res.ok && data.ok) {
        setStatus({ kind: "success" });
        setState(initial);
        return;
      }

      if (res.status === 422 && data.errors) {
        setErrors(data.errors);
        setStatus({ kind: "idle" });
        return;
      }

      setStatus({
        kind: "error",
        message:
          data.error ??
          "送信に失敗しました。しばらく経ってから再度お試しください。",
      });
    } catch {
      setStatus({
        kind: "error",
        message:
          "ネットワークエラーが発生しました。お電話または直接メールでご連絡ください。",
      });
    }
  };

  return (
    <article className="rounded-3xl bg-white border border-navy/10 p-6 md:p-8 shadow-card h-full flex flex-col">
      <div className="inline-flex items-center gap-2 self-start rounded-full bg-vermilion/10 text-vermilion px-3 py-1 text-[10px] md:text-xs font-bold tracking-widest uppercase">
        <Mail size={12} /> メールフォーム
      </div>
      <h3 className="mt-4 text-lg md:text-xl font-bold text-navy">
        テキストで相談したい方は、こちら。
      </h3>
      <p className="mt-2 text-xs md:text-sm text-ink/70 leading-relaxed">
        いただいた内容は <span className="font-bold">{company.email}</span>{" "}
        宛に届きます。1〜2 営業日以内にご返信いたします。
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 md:mt-7 space-y-4">
        {/* Honeypot：見えない・aria非表示 */}
        <div
          aria-hidden
          className="absolute left-[-9999px] top-[-9999px] opacity-0 pointer-events-none"
        >
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              type="text"
              value={state.website}
              onChange={update("website")}
            />
          </label>
        </div>

        <Field
          label="お名前"
          name="name"
          required
          value={state.name}
          onChange={update("name")}
          error={errors.name}
          autoComplete="name"
        />
        <Field
          label="会社名"
          name="companyName"
          value={state.companyName}
          onChange={update("companyName")}
          error={errors.companyName}
          autoComplete="organization"
          placeholder="株式会社○○"
        />
        <Field
          label="メールアドレス"
          name="email"
          type="email"
          required
          value={state.email}
          onChange={update("email")}
          error={errors.email}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          label="電話番号（任意）"
          name="phone"
          type="tel"
          value={state.phone}
          onChange={update("phone")}
          error={errors.phone}
          autoComplete="tel"
          placeholder="070-0000-0000"
        />

        <div>
          <label
            htmlFor="message"
            className="block text-xs md:text-sm font-bold text-navy mb-1.5"
          >
            ご相談内容
            <span className="text-vermilion ml-1">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            value={state.message}
            onChange={update("message")}
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "err-message" : undefined}
            placeholder="自動化したい業務、現状の課題、希望時期などをお書きください。"
            className={cn(
              "w-full rounded-xl border bg-paper px-4 py-3 text-sm md:text-base text-ink leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-vermilion/40 focus:border-vermilion",
              errors.message ? "border-vermilion" : "border-ink/15",
            )}
          />
          {errors.message && (
            <p id="err-message" className="mt-1 text-xs text-vermilion">
              {errors.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={status.kind === "submitting"}
            data-ga="contact_form_submit"
            className="inline-flex items-center justify-center gap-2 h-12 md:h-14 rounded-full bg-vermilion text-white font-bold shadow-[0_10px_30px_-10px_rgba(200,16,46,0.6)] hover:bg-vermilion-600 hover:-translate-y-0.5 transition disabled:opacity-60 disabled:pointer-events-none"
          >
            {status.kind === "submitting" ? (
              <>
                <Loader2 size={18} className="animate-spin" /> 送信中…
              </>
            ) : (
              <>
                <Send size={18} /> この内容で送信する
              </>
            )}
          </button>
          <p className="text-[11px] text-ink/50 leading-relaxed">
            送信ボタンを押すことで{" "}
            <a
              href="/legal/privacy-policy"
              className="underline underline-offset-2 hover:text-ink"
            >
              プライバシーポリシー
            </a>
            に同意したものとみなします。
          </p>
        </div>

        <AnimatePresence>
          {status.kind === "success" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 text-sm"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-bold">送信が完了しました。</div>
                <p className="mt-0.5 text-xs leading-relaxed">
                  1〜2営業日以内にご返信いたします。お急ぎの方はお電話でもご相談ください。
                </p>
              </div>
            </motion.div>
          )}
          {status.kind === "error" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 rounded-xl bg-vermilion/5 border border-vermilion/30 text-vermilion-700 px-4 py-3 text-sm"
            >
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <div className="leading-relaxed">{status.message}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </article>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  error,
  required,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  const errId = error ? `err-${name}` : undefined;
  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs md:text-sm font-bold text-navy mb-1.5"
      >
        {label}
        {required && <span className="text-vermilion ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={errId}
        className={cn(
          "w-full h-11 md:h-12 rounded-xl border bg-paper px-4 text-sm md:text-base text-ink transition focus:outline-none focus:ring-2 focus:ring-vermilion/40 focus:border-vermilion",
          error ? "border-vermilion" : "border-ink/15",
        )}
      />
      {error && (
        <p id={errId} className="mt-1 text-xs text-vermilion">
          {error}
        </p>
      )}
    </div>
  );
}

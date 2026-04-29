import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { contactRecipient, company } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  name?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  message?: string;
  /** Honeypot：bot対策。空のはず */
  website?: string;
};

/**
 * 必須項目を検証してエラー詳細を返す。
 * パフォーマンス向上のため、すべてのエラーを一気に集めて返す。
 */
function validate(p: Payload) {
  const errors: Record<string, string> = {};
  if (!p.name?.trim()) errors.name = "お名前を入力してください";
  if (!p.email?.trim()) errors.email = "メールアドレスを入力してください";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
    errors.email = "メールアドレスの形式が正しくありません";
  if (!p.message?.trim() || p.message.trim().length < 5)
    errors.message = "ご相談内容を5文字以上で入力してください";
  return errors;
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "不正なリクエストです" },
      { status: 400 },
    );
  }

  // Honeypot：bot は website フィールドに値を入れがちなので弾く
  if (payload.website && payload.website.length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const errors = validate(payload);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  const { name, companyName, email, phone, message } = payload;

  const subject = `【KUHAKU お問い合わせ】${name}様${companyName ? `（${companyName}）` : ""}`;
  const text = [
    "KUHAKU 公式LP のフォームよりお問い合わせを受信しました。",
    "",
    "──────────────────",
    `お名前    : ${name}`,
    `会社名    : ${companyName || "（未入力）"}`,
    `メール    : ${email}`,
    `電話番号  : ${phone || "（未入力）"}`,
    "──────────────────",
    "",
    "【ご相談内容】",
    (message ?? "").trim(),
    "",
    "──────────────────",
    `送信日時  : ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
  ].join("\n");

  // SMTP 環境変数が揃っていれば実送信、なければログのみ（dev／プレビュー想定）
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromAddress =
    process.env.SMTP_FROM ?? smtpUser ?? "no-reply@miyabee.jp";

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: smtpUser, pass: smtpPass },
      });
      await transporter.sendMail({
        from: `"${company.name} (KUHAKU)" <${fromAddress}>`,
        to: contactRecipient,
        replyTo: email,
        subject,
        text,
      });
      return NextResponse.json({ ok: true, mode: "sent" });
    } catch (err) {
      console.error("[contact] mail send failed", err);
      return NextResponse.json(
        {
          ok: false,
          error:
            "メールの送信に失敗しました。お手数ですがお電話でお問い合わせください。",
        },
        { status: 500 },
      );
    }
  }

  // 開発／プレビュー：SMTP未設定でもUI動線が壊れないようログのみで200
  console.log("[contact] SMTP未設定のためログのみ:\n", text);
  return NextResponse.json({ ok: true, mode: "logged" });
}

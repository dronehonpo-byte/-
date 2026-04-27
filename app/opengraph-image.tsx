import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KUHAKU｜あなたの会社に、AI社員を。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#2B4FD4",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 24,
            letterSpacing: "0.25em",
            color: "#C8102E",
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          <span
            style={{
              height: 14,
              width: 14,
              background: "#C8102E",
              borderRadius: 9999,
              display: "block",
            }}
          />
          KUHAKU
        </div>
        <div
          style={{
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.15,
          }}
        >
          あなたの会社に、
          <br />
          <span style={{ color: "#C8102E" }}>AI社員</span>を。
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.5,
          }}
        >
          中小企業のAI業務代行サービス。
          <br />
          平均月100時間削減 ／ 10万円〜 ／ 月額1万円で保守無制限
        </div>
      </div>
    ),
    { ...size },
  );
}

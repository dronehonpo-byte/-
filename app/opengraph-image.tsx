import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "KUHAKU｜社長専用、AI業務代行。月10万円から。";
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
            color: "white",
            fontWeight: 700,
            marginBottom: 40,
          }}
        >
          <span
            style={{
              height: 14,
              width: 14,
              background: "#FF6B4A",
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
          社長専用、
          <br />
          <span style={{ color: "#FF6B4A" }}>AI業務代行</span>。
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 28,
            color: "rgba(255,255,255,0.8)",
            lineHeight: 1.5,
          }}
        >
          メール・議事録・レポート・見積もり。
          <br />
          社長がやらなくていい仕事を、AIに巻き取らせる。
          <br />
          月10万円から ／ 完全成果報酬 ／ 全額返金保証
        </div>
      </div>
    ),
    { ...size },
  );
}

import React from "react";
import {
  AbsoluteFill,
  Img,
  getStaticFiles,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";
import { KeyVisualImg } from "./KeyVisual";

const hasStaticFile = (name: string) =>
  getStaticFiles().some((f) => f.name === name);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const useReveal = (start: number) => {
  const frame = useCurrentFrame();
  const e = easeOut(
    interpolate(frame, [start, start + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  return { opacity: e, transform: `translateY(${(1 - e) * 16}px)` };
};

const LogoSlot: React.FC = () => {
  // Use a /public/logo.* override if present, otherwise the bundled
  // 株式会社Miyabee lockup. multiply drops the white plate on the white card.
  const override = ["logo.png", "logo.svg", "logo.jpg"].find(hasStaticFile);
  const src = override ?? "brand/miyabee-h.png";
  return (
    <Img
      src={staticFile(src)}
      style={{
        width: 440,
        height: "auto",
        objectFit: "contain",
        mixBlendMode: "multiply",
      }}
    />
  );
};

const QrSlot: React.FC = () => {
  const qr = ["qr.png", "qr.svg", "qr.jpg"].find(hasStaticFile);
  return (
    <div
      style={{
        width: 190,
        height: 190,
        borderRadius: 22,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {qr ? (
        <Img
          src={staticFile(qr)}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 20,
            fontWeight: 400,
            color: "rgba(0,0,0,0.35)",
            letterSpacing: 1,
            textAlign: "center",
          }}
        >
          QR
          <br />
          スロット
        </div>
      )}
    </div>
  );
};

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const settle = easeOut(
    interpolate(frame, [0, 16], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const tagline = useReveal(6);
  const price = useReveal(20);
  const brand = useReveal(36);
  const date = useReveal(50);
  const cta = useReveal(62);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#ffffff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 40% at 50% 38%, rgba(91,140,255,0.08), transparent 70%)",
          opacity: settle,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* AI社員 key visual — already carries the tagline「人間1人以上の価値を。」 */}
        <div style={{ ...tagline, marginBottom: 34 }}>
          <KeyVisualImg variant="white" width={880} />
        </div>

        <div
          style={{
            ...price,
            fontFamily: FONT_FAMILY,
            fontSize: 36,
            fontWeight: 300,
            color: "rgba(11,12,15,0.75)",
            letterSpacing: 1.5,
            marginBottom: 66,
          }}
        >
          AI社員 ── 1人 月額98,000円
        </div>

        <div
          style={{
            ...brand,
            fontFamily: FONT_FAMILY,
            fontSize: 30,
            fontWeight: 300,
            color: "rgba(11,12,15,0.6)",
            letterSpacing: 4,
            marginBottom: 22,
          }}
        >
          慶應発スタートアップ
        </div>
        <div style={{ ...brand, marginBottom: 44 }}>
          <LogoSlot />
        </div>

        <div
          style={{
            ...date,
            fontFamily: FONT_FAMILY,
            fontSize: 46,
            fontWeight: 400,
            color: "#0b0c0f",
            letterSpacing: 3,
            marginBottom: 14,
          }}
        >
          2026.6.21 始動
        </div>
        <div
          style={{
            ...date,
            fontFamily: FONT_FAMILY,
            fontSize: 30,
            fontWeight: 300,
            color: "rgba(11,12,15,0.7)",
            letterSpacing: 2,
            marginBottom: 52,
          }}
        >
          先行ウェイトリスト受付中
        </div>

        <div style={cta}>
          <QrSlot />
        </div>
      </div>
    </AbsoluteFill>
  );
};

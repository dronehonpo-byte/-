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

const hasStaticFile = (name: string) =>
  getStaticFiles().some((f) => f.name === name);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Optional logo slot: drop /public/logo.png (or .svg) to replace the wordmark.
const LogoSlot: React.FC = () => {
  const logo = ["logo.png", "logo.svg", "logo.jpg"].find(hasStaticFile);
  if (logo) {
    return (
      <Img
        src={staticFile(logo)}
        style={{ height: 120, objectFit: "contain" }}
      />
    );
  }
  return (
    <div
      style={{
        fontFamily: FONT_FAMILY,
        fontSize: 96,
        fontWeight: 600,
        color: "#0b0c0f",
        letterSpacing: 2,
      }}
    >
      Miyabee
    </div>
  );
};

// Optional QR slot: drop /public/qr.png to fill the framed slot.
const QrSlot: React.FC = () => {
  const qr = ["qr.png", "qr.svg", "qr.jpg"].find(hasStaticFile);
  return (
    <div
      style={{
        width: 220,
        height: 220,
        borderRadius: 24,
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
            fontSize: 22,
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

  // Start white (carrying the bloom over) then settle into the card.
  const settle = easeOut(
    interpolate(frame, [0, 16], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const line1 = easeOut(
    interpolate(frame, [10, 30], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const line2 = easeOut(
    interpolate(frame, [24, 44], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const line3 = easeOut(
    interpolate(frame, [36, 56], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

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
            "radial-gradient(60% 40% at 50% 40%, rgba(91,140,255,0.08), transparent 70%)",
          opacity: settle,
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        <div
          style={{
            opacity: line1,
            transform: `translateY(${(1 - line1) * 18}px)`,
            fontFamily: FONT_FAMILY,
            fontSize: 34,
            fontWeight: 300,
            color: "rgba(11,12,15,0.6)",
            letterSpacing: 4,
            marginBottom: 34,
          }}
        >
          慶應発スタートアップ
        </div>

        <div
          style={{
            opacity: line1,
            transform: `translateY(${(1 - line1) * 18}px)`,
            marginBottom: 48,
          }}
        >
          <LogoSlot />
        </div>

        <div
          style={{
            opacity: line2,
            transform: `translateY(${(1 - line2) * 18}px)`,
            fontFamily: FONT_FAMILY,
            fontSize: 52,
            fontWeight: 400,
            color: "#0b0c0f",
            letterSpacing: 3,
            marginBottom: 18,
          }}
        >
          2026.6.21 始動
        </div>

        <div
          style={{
            opacity: line2,
            transform: `translateY(${(1 - line2) * 18}px)`,
            fontFamily: FONT_FAMILY,
            fontSize: 32,
            fontWeight: 300,
            color: "rgba(11,12,15,0.7)",
            letterSpacing: 2,
            marginBottom: 64,
          }}
        >
          先行ウェイトリスト受付中
        </div>

        <div
          style={{
            opacity: line3,
            transform: `translateY(${(1 - line3) * 18}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 22,
          }}
        >
          <QrSlot />
          {/* URL slot — replace with your launch URL */}
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 30,
              fontWeight: 400,
              color: "#0b0c0f",
              letterSpacing: 2,
            }}
          >
            miyabee.example.com
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";
import { KeyVisualImg } from "./KeyVisual";

const Line: React.FC<{ text: string; inAt: number; outAt: number; size: number }> = ({
  text,
  inAt,
  outAt,
  size,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [inAt, inAt + 14, outAt - 12, outAt],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const rise = interpolate(frame, [inAt, inAt + 22], [14, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity }}>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          color: COLORS.text,
          fontSize: size,
          fontWeight: 300,
          letterSpacing: 3,
          lineHeight: 1.4,
          textAlign: "center",
          padding: "0 70px",
          transform: `translateY(${rise}px)`,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// 0:00-0:05 — cold-open brand stamp, then the two opening lines.
export const OpeningScene: React.FC = () => {
  const frame = useCurrentFrame();

  // brief AI社員 key visual flash
  const logoOpacity = interpolate(frame, [4, 18, 34, 48], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoScale = interpolate(frame, [4, 48], [1.05, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(55% 40% at 50% 50%, rgba(91,140,255,0.10), transparent 70%)",
        }}
      />

      {logoOpacity > 0 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})` }}>
            <KeyVisualImg variant="dark" width={780} />
          </div>
        </AbsoluteFill>
      )}

      <Line text="あと、ひとり。" inAt={52} outAt={96} size={88} />
      <Line text="採用も、教育も、いらない。" inAt={102} outAt={150} size={78} />
    </AbsoluteFill>
  );
};

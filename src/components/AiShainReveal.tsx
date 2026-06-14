import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";
import { KeyVisualImg } from "./KeyVisual";

// 0:18-0:21 — "そこに、AI社員。" reveal using the metallic key visual with a
// sweeping glint over the logo.
export const AiShainReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const sokoni = interpolate(frame, [4, 18, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const logoOpacity = interpolate(
    frame,
    [20, 44, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const logoScale = interpolate(frame, [20, 60], [1.06, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(60% 45% at 50% 52%, rgba(91,140,255,0.16), transparent 65%)",
          opacity: logoOpacity,
        }}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: FONT_FAMILY,
            color: COLORS.text,
            fontSize: 56,
            fontWeight: 300,
            letterSpacing: 6,
            opacity: sokoni,
            marginBottom: 26,
          }}
        >
          そこに、
        </div>

        <div
          style={{
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
          }}
        >
          <KeyVisualImg variant="dark" width={940} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

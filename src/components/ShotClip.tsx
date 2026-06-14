import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  getStaticFiles,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";

// Returns true only if the file actually exists in /public, so the
// composition renders cleanly whether or not the shotN.mp4 assets are present.
const hasStaticFile = (name: string) =>
  getStaticFiles().some((f) => f.name === name);

const Placeholder: React.FC<{ label: string }> = ({ label }) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#000",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {/* subtle radial so the black isn't totally flat */}
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(60% 50% at 50% 45%, rgba(91,140,255,0.10), transparent 70%)",
      }}
    />
    <div
      style={{
        fontFamily: FONT_FAMILY,
        color: COLORS.textFaint,
        fontSize: 30,
        fontWeight: 300,
        letterSpacing: 4,
        textTransform: "uppercase",
      }}
    >
      {label}
    </div>
  </AbsoluteFill>
);

export const ShotClip: React.FC<{
  src: string;
  text: string;
}> = ({ src, text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const exists = hasStaticFile(src);

  // Quiet fade in / out for the whole clip.
  const clipOpacity = interpolate(
    frame,
    [0, 18, durationInFrames - 22, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Text fades a touch later and leaves a touch earlier than the footage.
  const textOpacity = interpolate(
    frame,
    [22, 46, durationInFrames - 40, durationInFrames - 18],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const textRise = interpolate(frame, [22, 60], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", opacity: clipOpacity }}>
      {exists ? (
        <OffthreadVideo
          src={staticFile(src)}
          muted
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Placeholder label={src} />
      )}

      {/* Cinematic darkening top & bottom for legibility */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-end",
          paddingBottom: 260,
          paddingLeft: 80,
          paddingRight: 80,
        }}
      >
        <div
          style={{
            fontFamily: FONT_FAMILY,
            color: COLORS.text,
            fontSize: 62,
            fontWeight: 300,
            lineHeight: 1.4,
            letterSpacing: 1.5,
            textAlign: "center",
            opacity: textOpacity,
            transform: `translateY(${textRise}px)`,
            textShadow: "0 2px 30px rgba(0,0,0,0.6)",
          }}
        >
          {text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import React from "react";
import { Img, staticFile } from "remotion";

const FILES = {
  dark: "brand/ai-shain-dark.jpeg", // metallic logo on pure black → screen blend
  white: "brand/ai-shain-white.jpeg", // dark logo on white → multiply blend
  light: "brand/ai-shain-light.jpeg",
} as const;

// The uploaded "AI社員" key visuals are JPEGs with baked backgrounds. We drop
// the background with a blend mode that matches the scene: "screen" lifts the
// bright logo off black, "multiply" keeps the dark logo on white.
// Fade the outer edges so the JPEG's (non-pure) background plate dissolves
// into the scene instead of leaving a faint rectangle under the blend.
const EDGE_MASK =
  "linear-gradient(90deg, transparent 0%, #000 5%, #000 95%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 9%, #000 91%, transparent 100%)";

export const KeyVisualImg: React.FC<{
  variant?: keyof typeof FILES;
  width: number;
  blend?: React.CSSProperties["mixBlendMode"];
  fadeEdges?: boolean;
  style?: React.CSSProperties;
}> = ({ variant = "dark", width, blend, fadeEdges = true, style }) => (
  <Img
    src={staticFile(FILES[variant])}
    style={
      {
        width,
        height: "auto",
        objectFit: "contain",
        mixBlendMode: blend ?? (variant === "dark" ? "screen" : "multiply"),
        ...(fadeEdges
          ? {
              maskImage: EDGE_MASK,
              maskComposite: "intersect",
              WebkitMaskImage: EDGE_MASK,
              WebkitMaskComposite: "source-in",
            }
          : {}),
        ...style,
      } as React.CSSProperties
    }
  />
);

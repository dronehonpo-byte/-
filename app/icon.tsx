import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1F5C",
          color: "#FFFFFF",
          fontSize: 40,
          fontWeight: 800,
          letterSpacing: "-0.05em",
        }}
      >
        K
      </div>
    ),
    { ...size },
  );
}

import React from "react";
import { Composition } from "remotion";
import { Teaser } from "./Teaser";
import { FPS, HEIGHT, TOTAL_DURATION, WIDTH, waitForFonts } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Teaser"
      component={Teaser}
      durationInFrames={TOTAL_DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      calculateMetadata={async () => {
        await waitForFonts();
        return {};
      }}
    />
  );
};

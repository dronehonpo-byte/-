import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  getStaticFiles,
  staticFile,
} from "remotion";
import {
  COLORS,
  END_DURATION,
  SHOT_DURATION,
  SHOTS,
  UI_DURATION,
} from "./theme";
import { ShotClip } from "./components/ShotClip";
import { UISegment } from "./components/UISegment";
import { EndCard } from "./components/EndCard";

const hasStaticFile = (name: string) =>
  getStaticFiles().some((f) => f.name === name);

export const Teaser: React.FC = () => {
  const uiStart = SHOTS.length * SHOT_DURATION; // 1050
  const endStart = uiStart + UI_DURATION; // 1380
  const hasMusic = hasStaticFile("music.mp3");

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {hasMusic && (
        <Audio src={staticFile("music.mp3")} volume={0.7} />
      )}

      {SHOTS.map((shot, i) => (
        <Sequence
          key={shot.src}
          from={i * SHOT_DURATION}
          durationInFrames={SHOT_DURATION}
        >
          <ShotClip src={shot.src} text={shot.text} />
        </Sequence>
      ))}

      <Sequence from={uiStart} durationInFrames={UI_DURATION}>
        <UISegment />
      </Sequence>

      <Sequence from={endStart} durationInFrames={END_DURATION}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

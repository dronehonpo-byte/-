import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  getStaticFiles,
  staticFile,
} from "remotion";
import { COLORS, SCENES, SHOTS, STARTS } from "./theme";
import { ShotClip } from "./components/ShotClip";
import { Dashboard } from "./components/Dashboard";
import { EndCard } from "./components/EndCard";
import { OpeningScene } from "./components/OpeningScene";
import { AiShainReveal } from "./components/AiShainReveal";

const hasStaticFile = (name: string) =>
  getStaticFiles().some((f) => f.name === name);

export const Teaser: React.FC = () => {
  const hasMusic = hasStaticFile("music.mp3");

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {hasMusic && <Audio src={staticFile("music.mp3")} volume={0.7} />}

      {/* 0:00-0:05 — cold-open AI社員 stamp + opening typography */}
      <Sequence from={STARTS.intro} durationInFrames={SCENES.intro}>
        <OpeningScene />
      </Sequence>

      {/* 0:05-0:12 — shot1 */}
      <Sequence from={STARTS.shot1} durationInFrames={SCENES.shot1}>
        <ShotClip src={SHOTS.shot1.src} text={SHOTS.shot1.text} />
      </Sequence>

      {/* 0:12-0:18 — shot2 */}
      <Sequence from={STARTS.shot2} durationInFrames={SCENES.shot2}>
        <ShotClip src={SHOTS.shot2.src} text={SHOTS.shot2.text} />
      </Sequence>

      {/* 0:18-0:21 — 「そこに、AI社員。」 key-visual reveal */}
      <Sequence from={STARTS.black2} durationInFrames={SCENES.black2}>
        <AiShainReveal />
      </Sequence>

      {/* 0:21-0:35 — AI employee dashboard (hero) */}
      <Sequence from={STARTS.dash} durationInFrames={SCENES.dash}>
        <Dashboard />
      </Sequence>

      {/* 0:35-0:40 — shot4 */}
      <Sequence from={STARTS.shot4} durationInFrames={SCENES.shot4}>
        <ShotClip src={SHOTS.shot4.src} text={SHOTS.shot4.text} />
      </Sequence>

      {/* 0:40-0:43 — shot3 */}
      <Sequence from={STARTS.shot3} durationInFrames={SCENES.shot3}>
        <ShotClip src={SHOTS.shot3.src} text={SHOTS.shot3.text} />
      </Sequence>

      {/* 0:43-0:47 — end card */}
      <Sequence from={STARTS.end} durationInFrames={SCENES.end}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

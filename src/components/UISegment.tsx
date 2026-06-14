import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { COLORS, FONT_FAMILY } from "../theme";

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Reveal a string char-by-char between [start, end] frames.
const useTypewriter = (text: string, start: number, end: number) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const count = Math.round(p * text.length);
  return { shown: text.slice(0, count), done: frame >= end };
};

const fadeUp = (frame: number, start: number, dur = 16, rise = 18) => {
  const t = interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const e = easeOut(t);
  return { opacity: e, transform: `translateY(${(1 - e) * rise}px)` };
};

const StatusPill: React.FC<{ frame: number }> = ({ frame }) => {
  // 待機中 -> 稼働中 (100) -> 承認待ち (250)
  let label = "待機中";
  let color = COLORS.textDim;
  let dot = COLORS.textDim;
  if (frame >= 250) {
    label = "承認待ち";
    color = COLORS.amber;
    dot = COLORS.amber;
  } else if (frame >= 100) {
    label = "稼働中";
    color = COLORS.green;
    dot = COLORS.green;
  }
  // gentle pulse while running / waiting
  const pulse =
    frame >= 100 ? 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(frame / 6)) : 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 22px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${COLORS.panelBorder}`,
        fontFamily: FONT_FAMILY,
        fontSize: 26,
        fontWeight: 400,
        color,
        letterSpacing: 1,
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: dot,
          opacity: pulse,
          boxShadow: `0 0 14px ${dot}`,
        }}
      />
      {label}
    </div>
  );
};

const FeedLog: React.FC<{
  frame: number;
  start: number;
  text: string;
}> = ({ frame, start, text }) => {
  if (frame < start) return null;
  const s = fadeUp(frame, start, 14, 14);
  return (
    <div
      style={{
        ...s,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        fontFamily: FONT_FAMILY,
        fontSize: 30,
        fontWeight: 300,
        color: COLORS.text,
        lineHeight: 1.45,
      }}
    >
      <span
        style={{
          color: COLORS.accent,
          fontWeight: 600,
          marginTop: 2,
          flexShrink: 0,
        }}
      >
        ›
      </span>
      <span>{text}</span>
    </div>
  );
};

const TaskCard: React.FC<{
  frame: number;
  start: number;
  title: string;
  sub: string;
}> = ({ frame, start, title, sub }) => {
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - start,
    fps,
    config: { damping: 18, mass: 0.7 },
    durationInFrames: 24,
  });
  const x = interpolate(enter, [0, 1], [80, 0]);
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateX(${x}px)`,
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "26px 30px",
        borderRadius: 22,
        background: COLORS.panel,
        border: `1px solid ${COLORS.panelBorder}`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: COLORS.accentSoft,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `2px solid ${COLORS.accent}`,
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 34,
            fontWeight: 500,
            color: COLORS.text,
            letterSpacing: 0.5,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 24,
            fontWeight: 300,
            color: COLORS.textDim,
          }}
        >
          {sub}
        </div>
      </div>
      <div
        style={{
          marginLeft: "auto",
          fontFamily: FONT_FAMILY,
          fontSize: 24,
          fontWeight: 400,
          color: COLORS.green,
        }}
      >
        ✓
      </div>
    </div>
  );
};

export const UISegment: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const container = fadeUp(frame, 0, 20, 24);

  const instruction = useTypewriter("埼玉の歯科を5件開拓して", 40, 96);
  const caretOn = Math.floor(frame / 8) % 2 === 0 && !instruction.done;

  // White bloom at the very end of the segment.
  const bloom = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const report = fadeUp(frame, 262, 22, 30);

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* ambient backdrop */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(70% 45% at 50% 18%, rgba(91,140,255,0.14), transparent 60%)",
        }}
      />

      <AbsoluteFill
        style={{
          padding: "150px 70px 120px 70px",
          ...container,
        }}
      >
        {/* Employee card */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            padding: 36,
            borderRadius: 30,
            background: COLORS.bgSoft,
            border: `1px solid ${COLORS.panelBorder}`,
          }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: 28,
              background:
                "linear-gradient(145deg, rgba(91,140,255,0.9), rgba(91,140,255,0.35))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_FAMILY,
              fontSize: 52,
              fontWeight: 600,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            ア
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 50,
                fontWeight: 500,
                color: COLORS.text,
                letterSpacing: 1,
              }}
            >
              アオイ
            </div>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 30,
                fontWeight: 300,
                color: COLORS.textDim,
                letterSpacing: 1,
              }}
            >
              AI営業社員
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <StatusPill frame={frame} />
          </div>
        </div>

        {/* Instruction input */}
        <div style={{ marginTop: 36 }}>
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 24,
              fontWeight: 400,
              color: COLORS.textFaint,
              letterSpacing: 2,
              marginBottom: 14,
              textTransform: "uppercase",
            }}
          >
            指示
          </div>
          <div
            style={{
              minHeight: 96,
              padding: "26px 30px",
              borderRadius: 22,
              background: COLORS.panel,
              border: `1px solid ${
                frame >= 40 && !instruction.done
                  ? COLORS.accent
                  : COLORS.panelBorder
              }`,
              fontFamily: FONT_FAMILY,
              fontSize: 38,
              fontWeight: 300,
              color: COLORS.text,
              display: "flex",
              alignItems: "center",
            }}
          >
            {instruction.shown}
            <span
              style={{
                display: "inline-block",
                width: 3,
                height: 40,
                marginLeft: 4,
                background: COLORS.accent,
                opacity: caretOn ? 1 : 0,
              }}
            />
          </div>
        </div>

        {/* Live feed */}
        <div style={{ marginTop: 40 }}>
          <div
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: 24,
              fontWeight: 400,
              color: COLORS.textFaint,
              letterSpacing: 2,
              marginBottom: 18,
              textTransform: "uppercase",
            }}
          >
            稼働フィード
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <FeedLog frame={frame} start={104} text="リサーチを開始します" />
            <FeedLog
              frame={frame}
              start={134}
              text="○○歯科をリスト化（HPなし→優先）"
            />
            <FeedLog frame={frame} start={168} text="デモHPを作成中…" />
            <FeedLog
              frame={frame}
              start={202}
              text="営業文案を作成しました"
            />
          </div>
        </div>

        {/* Task cards */}
        <div
          style={{
            marginTop: 40,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <TaskCard frame={frame} start={130} title="リスト" sub="開拓候補 5件" />
          <TaskCard
            frame={frame}
            start={162}
            title="デモHP"
            sub="提案用ページ生成"
          />
          <TaskCard
            frame={frame}
            start={196}
            title="営業文案"
            sub="初回コンタクト文面"
          />
          <TaskCard
            frame={frame}
            start={228}
            title="契約書ドラフト"
            sub="電子契約テンプレート"
          />
        </div>

        {/* Daily report card */}
        {frame >= 262 && (
          <div
            style={{
              ...report,
              marginTop: "auto",
              padding: 34,
              borderRadius: 26,
              background:
                "linear-gradient(135deg, rgba(244,196,83,0.12), rgba(255,255,255,0.03))",
              border: `1px solid rgba(244,196,83,0.35)`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 24,
                fontWeight: 400,
                color: COLORS.amber,
                letterSpacing: 2,
                marginBottom: 12,
              }}
            >
              日報
            </div>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 40,
                fontWeight: 300,
                color: COLORS.text,
                lineHeight: 1.4,
              }}
            >
              本日5件開拓。承認をお願いします。
            </div>
          </div>
        )}
      </AbsoluteFill>

      {/* White bloom out */}
      <AbsoluteFill
        style={{
          backgroundColor: "#fff",
          opacity: bloom,
        }}
      />
    </AbsoluteFill>
  );
};

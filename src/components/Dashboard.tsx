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
const clamp01 = (t: number) =>
  interpolate(t, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// ── Phase markers (local frames, 0..419) ────────────────────────────────
const P = {
  speakStart: 55, // 音声波形がせり上がる
  transcribeStart: 62,
  transcribeEnd: 128,
  ignite: 138, // 起動：オーブ強発光 → 稼働中
  handoff: 150, // 中央ステージ → ダッシュボードへ
  settle: 330, // 整列 → 承認待ち
  report: 348,
  bloom: 392,
};

const INSTRUCTION = "埼玉の歯科を5件開拓して";

// ── Glowing orb ─────────────────────────────────────────────────────────
const Orb: React.FC<{ size: number; intensity: number }> = ({
  size,
  intensity,
}) => {
  const frame = useCurrentFrame();
  const pulse = 1 + Math.sin(frame / 9) * 0.03 * intensity;
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        transform: `scale(${pulse})`,
      }}
    >
      {/* outer bloom */}
      <div
        style={{
          position: "absolute",
          inset: -size * 0.6,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(143,180,255,${
            0.28 * intensity
          }), transparent 65%)`,
          filter: `blur(${size * 0.12}px)`,
        }}
      />
      {/* core */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, #ffffff 0%, #cfe0ff 22%, #6f9bff 55%, #2f5bd0 100%)",
          boxShadow: `0 0 ${size * 0.5}px rgba(120,160,255,${
            0.7 * intensity
          }), inset 0 0 ${size * 0.25}px rgba(255,255,255,0.6)`,
        }}
      />
      {/* highlight */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          left: "20%",
          width: "34%",
          height: "26%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%)",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
};

// ── Voice waveform ──────────────────────────────────────────────────────
const Waveform: React.FC<{ rise: number; active: number }> = ({
  rise,
  active,
}) => {
  const frame = useCurrentFrame();
  const bars = 42;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        height: 120,
        transform: `translateY(${(1 - rise) * 140}px)`,
        opacity: rise,
      }}
    >
      {new Array(bars).fill(0).map((_, i) => {
        const env = Math.sin((i / (bars - 1)) * Math.PI); // taller in the middle
        const wob =
          0.5 + 0.5 * Math.sin(frame / 4 + i * 0.7) * (0.4 + 0.6 * env);
        const h = 8 + wob * 96 * active * (0.4 + 0.6 * env);
        return (
          <div
            key={i}
            style={{
              width: 6,
              height: h,
              borderRadius: 4,
              background: `linear-gradient(180deg, ${COLORS.accentBright}, ${COLORS.accent})`,
              boxShadow: `0 0 10px rgba(91,140,255,0.5)`,
            }}
          />
        );
      })}
    </div>
  );
};

const StatusPill: React.FC<{ frame: number; small?: boolean }> = ({
  frame,
  small,
}) => {
  let label = "稼働可能";
  let color = COLORS.textDim;
  if (frame >= P.settle) {
    label = "承認待ち";
    color = COLORS.amber;
  } else if (frame >= P.ignite) {
    label = "稼働中";
    color = COLORS.green;
  }
  const pulse =
    frame >= P.ignite && frame < P.settle
      ? 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(frame / 5))
      : 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: small ? "9px 18px" : "12px 22px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.05)",
        border: `1px solid ${COLORS.panelBorder}`,
        fontFamily: FONT_FAMILY,
        fontSize: small ? 24 : 26,
        fontWeight: 400,
        color,
        letterSpacing: 1,
        whiteSpace: "nowrap",
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: color,
          opacity: pulse,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      {label}
    </div>
  );
};

const Panel: React.FC<{
  frame: number;
  start: number;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ frame, start, title, children, style }) => {
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - start,
    fps,
    config: { damping: 20, mass: 0.8 },
    durationInFrames: 26,
  });
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 40}px)`,
        background: COLORS.bgSoft,
        border: `1px solid ${COLORS.panelBorder}`,
        borderRadius: 24,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 22,
          fontWeight: 400,
          color: COLORS.textFaint,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
};

// ── Map with dropping lead pins ─────────────────────────────────────────
const PINS = [
  { x: 0.22, y: 0.34, at: 168, hpless: false },
  { x: 0.54, y: 0.26, at: 184, hpless: true },
  { x: 0.74, y: 0.52, at: 202, hpless: false },
  { x: 0.38, y: 0.64, at: 222, hpless: true },
  { x: 0.62, y: 0.74, at: 244, hpless: false },
];
const MapPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  return (
    <Panel frame={frame} start={158} title="リードマップ・埼玉" style={{ flex: 1 }}>
      <div
        style={{
          position: "relative",
          height: 230,
          borderRadius: 16,
          overflow: "hidden",
          background:
            "linear-gradient(145deg, #0b1220, #0a0f18), radial-gradient(60% 60% at 40% 30%, rgba(91,140,255,0.12), transparent 70%)",
          backgroundBlendMode: "screen",
        }}
      >
        {/* abstract street grid */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(120,150,220,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(120,150,220,0.10) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(115deg, transparent 46%, rgba(120,150,220,0.16) 47%, rgba(120,150,220,0.16) 49%, transparent 50%)",
          }}
        />
        {PINS.map((p, i) => {
          const drop = spring({
            frame: frame - p.at,
            fps,
            config: { damping: 12, mass: 0.6 },
            durationInFrames: 22,
          });
          const c = p.hpless ? COLORS.pinNew : COLORS.accentBright;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: `${p.x * 100}%`,
                top: `${p.y * 100}%`,
                transform: `translate(-50%, -100%) translateY(${
                  (1 - drop) * -34
                }px)`,
                opacity: clamp01(drop * 1.4),
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50% 50% 50% 0",
                  transform: "rotate(-45deg)",
                  background: c,
                  boxShadow: `0 0 14px ${c}`,
                  border: "2px solid rgba(255,255,255,0.85)",
                }}
              />
              {p.hpless && (
                <div
                  style={{
                    position: "absolute",
                    top: 22,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontFamily: FONT_FAMILY,
                    fontSize: 16,
                    color: COLORS.pinNew,
                    whiteSpace: "nowrap",
                    fontWeight: 500,
                  }}
                >
                  HPなし
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

// ── Demo HP preview building up ─────────────────────────────────────────
const DemoHpPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const block = (start: number) =>
    easeOut(
      interpolate(frame, [start, start + 16], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
  return (
    <Panel frame={frame} start={180} title="デモHP生成" style={{ flex: 1 }}>
      <div
        style={{
          height: 230,
          borderRadius: 16,
          background: "#0c1018",
          border: `1px solid ${COLORS.panelBorder}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* browser chrome */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 12px",
            borderBottom: `1px solid ${COLORS.panelBorder}`,
          }}
        >
          <div style={{ display: "flex", gap: 5 }}>
            {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
              <div
                key={c}
                style={{ width: 9, height: 9, borderRadius: 9, background: c }}
              />
            ))}
          </div>
          <div
            style={{
              marginLeft: 6,
              flex: 1,
              height: 16,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
            }}
          />
        </div>
        {/* page blocks */}
        <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
          <div
            style={{
              opacity: block(196),
              height: 46,
              borderRadius: 8,
              background:
                "linear-gradient(120deg, rgba(91,140,255,0.7), rgba(143,180,255,0.35))",
            }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <div
              style={{
                opacity: block(214),
                flex: 1,
                height: 60,
                borderRadius: 8,
                background: "rgba(255,255,255,0.07)",
              }}
            />
            <div
              style={{
                opacity: block(226),
                flex: 1,
                height: 60,
                borderRadius: 8,
                background: "rgba(255,255,255,0.07)",
              }}
            />
          </div>
          <div
            style={{
              opacity: block(240),
              alignSelf: "flex-start",
              padding: "8px 22px",
              borderRadius: 8,
              background: COLORS.accent,
              color: "#fff",
              fontFamily: FONT_FAMILY,
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            予約する
          </div>
        </div>
      </div>
    </Panel>
  );
};

// ── Streaming sales email ───────────────────────────────────────────────
const EMAIL_BODY =
  "貴院のホームページ制作のご提案です。地域の患者様に選ばれる予約導線を、最短即日でご用意します。";
const EmailPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const shown = Math.round(
    interpolate(frame, [206, 322], [0, EMAIL_BODY.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const caret = Math.floor(frame / 6) % 2 === 0 && shown < EMAIL_BODY.length;
  return (
    <Panel frame={frame} start={196} title="営業文案ストリーミング">
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 22,
          fontWeight: 300,
          color: COLORS.textDim,
        }}
      >
        To：○○歯科クリニック 様
      </div>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 26,
          fontWeight: 300,
          color: COLORS.text,
          lineHeight: 1.6,
          minHeight: 88,
        }}
      >
        {EMAIL_BODY.slice(0, shown)}
        <span style={{ opacity: caret ? 1 : 0, color: COLORS.accent }}>▍</span>
      </div>
    </Panel>
  );
};

const KpiPanel: React.FC<{ frame: number }> = ({ frame }) => {
  const v = Math.round(
    interpolate(frame, [176, 300], [0, 5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  return (
    <Panel frame={frame} start={158} title="本日の開拓" style={{ width: 300 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 96,
            fontWeight: 600,
            color: COLORS.text,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {v}
        </div>
        <div
          style={{
            fontFamily: FONT_FAMILY,
            fontSize: 32,
            fontWeight: 300,
            color: COLORS.textDim,
          }}
        >
          件
        </div>
      </div>
    </Panel>
  );
};

const FEED = [
  { at: 150, text: "リサーチを開始します" },
  { at: 168, text: "埼玉の歯科をリスト化（HPなし→優先）" },
  { at: 196, text: "デモHPを作成中…" },
  { at: 232, text: "営業文案を作成しました" },
];
const FeedPanel: React.FC<{ frame: number }> = ({ frame }) => {
  return (
    <Panel frame={frame} start={150} title="稼働フィード" style={{ flex: 1 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {FEED.map((f, i) => {
          const o = easeOut(
            interpolate(frame, [f.at, f.at + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          );
          return (
            <div
              key={i}
              style={{
                opacity: o,
                transform: `translateX(${(1 - o) * 16}px)`,
                display: "flex",
                gap: 12,
                fontFamily: FONT_FAMILY,
                fontSize: 23,
                fontWeight: 300,
                color: COLORS.text,
                lineHeight: 1.4,
              }}
            >
              <span style={{ color: COLORS.accent, fontWeight: 600 }}>›</span>
              <span>{f.text}</span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
};

const TASKS = [
  { at: 206, title: "リスト" },
  { at: 226, title: "デモHP" },
  { at: 248, title: "営業文案" },
  { at: 270, title: "契約書" },
];
const TaskRow: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", gap: 16 }}>
      {TASKS.map((t, i) => {
        const enter = spring({
          frame: frame - t.at,
          fps,
          config: { damping: 16, mass: 0.6 },
          durationInFrames: 22,
        });
        return (
          <div
            key={i}
            style={{
              flex: 1,
              opacity: enter,
              transform: `translateY(${(1 - enter) * 30}px)`,
              background: COLORS.panel,
              border: `1px solid ${COLORS.panelBorder}`,
              borderRadius: 18,
              padding: "20px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 11,
                background: COLORS.accentSoft,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: COLORS.green,
                fontFamily: FONT_FAMILY,
                fontSize: 22,
              }}
            >
              ✓
            </div>
            <div
              style={{
                fontFamily: FONT_FAMILY,
                fontSize: 24,
                fontWeight: 500,
                color: COLORS.text,
              }}
            >
              {t.title}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ReportCard: React.FC<{ frame: number }> = ({ frame }) => {
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: frame - P.report,
    fps,
    config: { damping: 20, mass: 0.9 },
    durationInFrames: 28,
  });
  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 50}px)`,
        padding: 28,
        borderRadius: 24,
        background:
          "linear-gradient(135deg, rgba(244,196,83,0.14), rgba(255,255,255,0.03))",
        border: "1px solid rgba(244,196,83,0.35)",
      }}
    >
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 22,
          fontWeight: 400,
          color: COLORS.amber,
          letterSpacing: 2,
          marginBottom: 10,
        }}
      >
        日報
      </div>
      <div
        style={{
          fontFamily: FONT_FAMILY,
          fontSize: 34,
          fontWeight: 300,
          color: COLORS.text,
          lineHeight: 1.45,
        }}
      >
        本日5件開拓。承認をお願いします。次は△△を推奨します。
      </div>
    </div>
  );
};

// ── Composed dashboard ──────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // background glow ramps up on ignite, then blooms white at the end.
  const glow = interpolate(frame, [0, P.ignite, P.settle], [0.4, 1, 0.85], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const igniteFlash = interpolate(
    frame,
    [P.ignite, P.ignite + 8, P.ignite + 26],
    [0, 0.5, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const bloom = interpolate(frame, [P.bloom, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // crossfade between the centered intro stage and the dashboard
  const introOut = interpolate(frame, [P.handoff, P.handoff + 28], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const dashIn = interpolate(frame, [P.handoff - 6, P.handoff + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const speakRise = clamp01(
    interpolate(frame, [P.speakStart, P.speakStart + 24], [0, 1])
  );
  const transShown = Math.round(
    interpolate(
      frame,
      [P.transcribeStart, P.transcribeEnd],
      [0, INSTRUCTION.length],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    )
  );
  const intensity = interpolate(frame, [0, P.ignite], [0.55, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* ambient blue→white glow */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(70% 50% at 50% ${
            frame < P.handoff ? "46%" : "12%"
          }, rgba(91,140,255,${0.18 * glow}), transparent 62%)`,
        }}
      />

      {/* ── Intro stage (waiting → speaking) ── */}
      {introOut > 0 && (
        <AbsoluteFill
          style={{
            opacity: introOut,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <Orb size={300} intensity={intensity} />
          <div
            style={{
              marginTop: 56,
              display: "flex",
              alignItems: "center",
              gap: 22,
              padding: "22px 34px",
              borderRadius: 26,
              background: COLORS.bgSoft,
              border: `1px solid ${COLORS.panelBorder}`,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 44,
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
                  fontSize: 26,
                  fontWeight: 300,
                  color: COLORS.textDim,
                }}
              >
                AI営業社員
              </div>
            </div>
            <StatusPill frame={frame} />
          </div>

          {/* transcription synced to the waveform */}
          <div
            style={{
              marginTop: 40,
              minHeight: 56,
              fontFamily: FONT_FAMILY,
              fontSize: 40,
              fontWeight: 300,
              color: COLORS.text,
              opacity: speakRise,
              letterSpacing: 1,
            }}
          >
            {INSTRUCTION.slice(0, transShown)}
            <span
              style={{
                opacity: frame > P.speakStart && transShown < INSTRUCTION.length ? 1 : 0,
                color: COLORS.accent,
              }}
            >
              ▍
            </span>
          </div>

          <div style={{ position: "absolute", bottom: 150, width: "100%" }}>
            <Waveform rise={speakRise} active={speakRise} />
          </div>
        </AbsoluteFill>
      )}

      {/* ── Dashboard ── */}
      {dashIn > 0 && (
        <AbsoluteFill
          style={{
            opacity: dashIn,
            padding: "70px 56px 56px 56px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <Orb size={72} intensity={1} />
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 38,
                  fontWeight: 500,
                  color: COLORS.text,
                }}
              >
                アオイ
              </div>
              <div
                style={{
                  fontFamily: FONT_FAMILY,
                  fontSize: 22,
                  fontWeight: 300,
                  color: COLORS.textDim,
                }}
              >
                AI営業社員
              </div>
            </div>
            <div style={{ marginLeft: "auto" }}>
              <StatusPill frame={frame} small />
            </div>
          </div>

          {/* instruction chip */}
          <div
            style={{
              padding: "16px 24px",
              borderRadius: 16,
              background: COLORS.panel,
              border: `1px solid ${COLORS.panelBorder}`,
              fontFamily: FONT_FAMILY,
              fontSize: 28,
              fontWeight: 300,
              color: COLORS.text,
            }}
          >
            <span style={{ color: COLORS.textFaint, marginRight: 12 }}>指示</span>
            {INSTRUCTION}
          </div>

          {/* KPI + feed */}
          <div style={{ display: "flex", gap: 18 }}>
            <KpiPanel frame={frame} />
            <FeedPanel frame={frame} />
          </div>

          {/* map + demo HP */}
          <div style={{ display: "flex", gap: 18 }}>
            <MapPanel frame={frame} />
            <DemoHpPanel frame={frame} />
          </div>

          {/* email */}
          <EmailPanel frame={frame} />

          {/* tasks */}
          <TaskRow frame={frame} />

          {/* report */}
          {frame >= P.report - 4 && <ReportCard frame={frame} />}
        </AbsoluteFill>
      )}

      {/* ignite flash + final white bloom */}
      <AbsoluteFill
        style={{ backgroundColor: "#fff", opacity: Math.max(igniteFlash, bloom) }}
      />
    </AbsoluteFill>
  );
};

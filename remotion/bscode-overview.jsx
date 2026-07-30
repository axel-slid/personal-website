import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig
} from "remotion";

const scenes = [
  {
    start: 0,
    end: 112,
    image: "assets/bscode/agent-grid.jpg",
    label: "Four agents. One workspace.",
    detail: "Prompts, terminals, files, and progress stay visible."
  },
  {
    start: 92,
    end: 222,
    image: "assets/bscode/motion/workspace-cinematic.jpg",
    label: "Focus without losing context.",
    detail: "Cinematic mode keeps every agent one command away."
  },
  {
    start: 202,
    end: 322,
    image: "assets/bscode/motion/pixel-pet.jpg",
    label: "The same work, from another angle.",
    detail: "Pixel mode turns live agent state into a navigable tower."
  },
  {
    start: 302,
    end: 360,
    image: "assets/bscode/agent-grid.jpg",
    label: "Four agents. One workspace.",
    detail: "Prompts, terminals, files, and progress stay visible."
  }
];

const palette = {
  background: "#080b11",
  panel: "#111722",
  line: "rgba(177, 205, 240, 0.23)",
  text: "#f5f8fc",
  muted: "#93a2b6",
  blue: "#79b9ff",
  mint: "#73ddbd"
};

const sceneOpacity = (frame, start, end) => {
  const fade = 20;
  if (start === 0) {
    return interpolate(frame, [end - fade, end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    });
  }
  if (end === 360) {
    return interpolate(frame, [start, start + fade], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp"
    });
  }
  return interpolate(
    frame,
    [start, start + fade, end - fade, end],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
};

export const BsCodeOverview = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const loopPhase = (frame / durationInFrames) * Math.PI * 2;
  const windowLift = Math.sin(loopPhase) * 4;

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 15% 15%, rgba(60,126,240,.22), transparent 32%), radial-gradient(circle at 84% 80%, rgba(65,193,159,.14), transparent 29%), #080b11",
        color: palette.text,
        fontFamily: "Inter, Arial, sans-serif"
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 60,
          border: `1px solid ${palette.line}`,
          borderRadius: 34,
          background: "linear-gradient(145deg, rgba(18,24,35,.98), rgba(8,12,18,.98))",
          boxShadow: "0 42px 110px rgba(0,0,0,.52)",
          overflow: "hidden",
          transform: `translateY(${windowLift}px)`
        }}
      >
        <div
          style={{
            height: 74,
            display: "grid",
            gridTemplateColumns: "160px 1fr 160px",
            alignItems: "center",
            padding: "0 28px",
            borderBottom: `1px solid ${palette.line}`,
            background: "rgba(5,8,12,.62)"
          }}
        >
          <div style={{ display: "flex", gap: 11 }}>
            {["#e56c68", "#e8bd57", "#69c37b"].map((color) => (
              <span key={color} style={{ width: 13, height: 13, borderRadius: "50%", background: color }} />
            ))}
          </div>
          <div style={{ justifySelf: "center", fontSize: 18, color: "#a8b5c6", letterSpacing: "-.01em" }}>
            BsCode · agent-workbench
          </div>
          <div style={{ justifySelf: "end", fontSize: 14, color: "#728196", fontFamily: "monospace" }}>
            4 agents
          </div>
        </div>

        <div style={{ position: "absolute", inset: "74px 0 118px", overflow: "hidden", background: "#090c12" }}>
          {scenes.map((scene, index) => {
            const opacity = sceneOpacity(frame, scene.start, scene.end);
            const progress = interpolate(frame, [scene.start, scene.end], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp"
            });
            const scale = 1 + Math.sin(progress * Math.PI) * 0.012;
            return (
              <Img
                key={`${scene.image}-${index}`}
                src={staticFile(scene.image)}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  opacity,
                  transform: `scale(${scale})`
                }}
              />
            );
          })}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(180deg, rgba(3,6,10,.02), rgba(3,6,10,.22))",
              pointerEvents: "none"
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 118,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 30,
            padding: "0 36px",
            borderTop: `1px solid ${palette.line}`,
            background: "rgba(7,10,15,.96)"
          }}
        >
          <div style={{ position: "relative", height: 62 }}>
            {scenes.map((scene, index) => {
              const opacity = sceneOpacity(frame, scene.start, scene.end);
              return (
                <div
                  key={`${scene.label}-${index}`}
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    alignContent: "center",
                    gap: 7,
                    opacity
                  }}
                >
                  <strong style={{ fontSize: 22, letterSpacing: "-.02em" }}>{scene.label}</strong>
                  <span style={{ color: palette.muted, fontSize: 14 }}>{scene.detail}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {[0, 1, 2].map((index) => {
              const active = index === 0
                ? frame < 112 || frame >= 302
                : index === 1
                  ? frame >= 92 && frame < 222
                  : frame >= 202 && frame < 322;
              return (
                <span
                  key={index}
                  style={{
                    width: active ? 34 : 9,
                    height: 9,
                    borderRadius: 999,
                    background: active ? palette.blue : "#374354"
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

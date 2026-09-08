import React from "react";
import {Composition, registerRoot, interpolate, useCurrentFrame} from "remotion";
import {OpenleafExactRemotion} from "./openleaf-exact-remotion";
const chapters = {
  Papers: { from: 155, to: 345, frames: 360 },
  Python: { from: 605, to: 678, frames: 330 },
  Slides: { from: 792, to: 934, frames: 360 },
};
const CoreDemo = ({chapter}) => {
  const frame = useCurrentFrame();
  const spec = chapters[chapter];
  const appFrame = Math.round(interpolate(frame, [20, spec.frames - 35], [spec.from, spec.to], {extrapolateLeft: "clamp", extrapolateRight: "clamp"}));
  return <OpenleafExactRemotion frameOverride={appFrame}/>;
};
const Root = () => <>{Object.entries(chapters).map(([id, spec]) => <Composition key={id} id={id} component={CoreDemo} defaultProps={{chapter: id}} durationInFrames={spec.frames} fps={30} width={1920} height={1080}/>)}</>;
registerRoot(Root);

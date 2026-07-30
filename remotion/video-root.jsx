import React from "react";
import { Composition } from "remotion";
import { BsCodeOverview } from "./bscode-overview";

export const VideoRoot = () => (
  <Composition
    id="BsCodeOverview"
    component={BsCodeOverview}
    durationInFrames={360}
    fps={30}
    width={1280}
    height={720}
  />
);

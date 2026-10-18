"use client";

import { Player } from "@remotion/player";
import { SCENES } from "@/video/pitch/scenes";
import type { Cue } from "@/video/pitch/script";
import { FPS, HEIGHT, WIDTH } from "@/video/pitch/theme";

/*
 * One scene of the pitch film in the live deck. It never stops on its own:
 * the build completes and stays complete, while live details (sparks on the
 * wires, pulsing dots, the call clock, the light) keep moving for as long as
 * the speaker stays on the slide. The scene is given 20 minutes of timeline
 * for that. Loaded client-only: Remotion's font loader and the Player need
 * a browser.
 */
const LIVE_FRAMES = 20 * 60 * FPS;

export function ScenePlayer({ cue, built }: { cue: Cue; built: boolean }) {
  return (
    <Player
      component={SCENES[cue.id]}
      durationInFrames={LIVE_FRAMES}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      initialFrame={built ? cue.built : 0}
      autoPlay
      // The film has no sound. Unmuted, the Player waits for its AudioContext
      // to resume, which Chrome allows only after a click or keypress, so the
      // first scene would not start on page load.
      initiallyMuted
      numberOfSharedAudioTags={0}
      controls={false}
      clickToPlay={false}
      spaceKeyToPlayOrPause={false}
      doubleClickToFullscreen={false}
      acknowledgeRemotionLicense
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/** A scene with its own controls, for the scrolling phone layout. */
export function ScenePreview({ cue }: { cue: Cue }) {
  return (
    <Player
      component={SCENES[cue.id]}
      durationInFrames={cue.seconds * FPS}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      initialFrame={cue.built}
      controls
      numberOfSharedAudioTags={0}
      acknowledgeRemotionLicense
      style={{ width: "100%", aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    />
  );
}

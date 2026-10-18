import { Fragment } from "react";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SCENES } from "./scenes";
import { FADE, SCRIPT } from "./script";
import { FPS } from "./theme";

/*
 * The whole film: every scene in script order with a short cross-fade.
 * Each scene but the last is lengthened by the fade it shares with the next
 * one, so the film keeps the script's exact 3:00.
 */

const cues = SCRIPT.filter((c) => SCENES[c.id]);

export const PITCH_FRAMES = cues.reduce((sum, c) => sum + c.seconds * FPS, 0);

export function Pitch() {
  return (
    <TransitionSeries>
      {cues.map((cue, k) => {
        const Scene = SCENES[cue.id];
        const last = k === cues.length - 1;
        return (
          <Fragment key={cue.id}>
            <TransitionSeries.Sequence name={cue.section} durationInFrames={cue.seconds * FPS + (last ? 0 : FADE)}>
              <Scene />
            </TransitionSeries.Sequence>
            {!last && <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: FADE })} />}
          </Fragment>
        );
      })}
    </TransitionSeries>
  );
}

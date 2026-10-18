import { Composition, Folder } from "remotion";
import { PITCH_FRAMES, Pitch } from "./pitch/Pitch";
import { SCENES } from "./pitch/scenes";
import { APPENDIX, SCRIPT } from "./pitch/script";
import { FPS, HEIGHT, WIDTH } from "./pitch/theme";

/*
 * Compositions of the WikiAI pitch film. "Pitch" is the whole 3-minute film;
 * each scene is also registered on its own for previews and stills, and the
 * web deck plays the same scene components with @remotion/player. The
 * appendix scenes are registered too but are not in the film.
 */
export function RemotionRoot() {
  return (
    <>
      <Composition id="Pitch" component={Pitch} durationInFrames={PITCH_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Folder name="Scenes">
        {SCRIPT.filter((c) => SCENES[c.id]).map((cue, k) => (
          <Composition
            key={cue.id}
            id={`S${String(k + 1).padStart(2, "0")}-${cue.id}`}
            component={SCENES[cue.id]}
            durationInFrames={cue.seconds * FPS}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
      <Folder name="Appendix">
        {APPENDIX.filter((c) => SCENES[c.id]).map((cue, k) => (
          <Composition
            key={cue.id}
            id={`A${k + 1}-${cue.id}`}
            component={SCENES[cue.id]}
            durationInFrames={cue.seconds * FPS}
            fps={FPS}
            width={WIDTH}
            height={HEIGHT}
          />
        ))}
      </Folder>
    </>
  );
}

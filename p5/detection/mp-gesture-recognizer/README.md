# MediaPipe gesture recognizer

## What it does

Recognizes hand gestures and uses them as controls for drawing in the air:

- ☝ **Pointing_Up**: draw with your index fingertip.
- ✋ **Open_Palm**: clear the drawing.
- 👍 **Thumb_Up**: change the color.

It also labels each hand with its current gesture and confidence.

## Key data

- `result.gestures`: per hand, `[{ categoryName, score }]` with the best guess first.
  - Built-in labels: `None`, `Closed_Fist`, `Open_Palm`, `Pointing_Up`, `Thumb_Down`, `Thumb_Up`, `Victory`, `ILoveYou`.
- `result.handedness`: per hand, `[{ categoryName: 'Left' | 'Right', score }]`.
- `result.landmarks`: per hand, 21 × `{ x, y, z }`. `x` and `y` run from 0 to 1 across the video. The sketch multiplies them by `videoWidth`/`videoHeight` and then calls `cam.mapPoint()`.
- `hands`: `[{ gesture, score, side, points }]`, with points in canvas pixels.
- Actions fire once when a gesture starts (`previousGesture`), not on every frame it is held.

## Desktop

- Any browser with WebGL2, using the GPU delegate (with a CPU fallback).
- Mirrored webcam. Gestures don't depend on the mirror, but `handedness` refers to the unmirrored image.

## Phone

- Front camera. Hold the phone at arm's length or prop it up so your hand stays in view.
- About 8 MB of model plus the MediaPipe wasm on first load. Use Wi‑Fi.

## Custom gestures

Train your own gestures with Google's [gesture recognizer customization guide](https://ai.google.dev/edge/mediapipe/solutions/customization/gesture_recognizer) (a Colab notebook built on Model Maker).

- Model Maker is still available but no longer maintained.
- Your dataset needs a `none` class.
- The export is a `gesture_recognizer.task` file. Put it in `models/` and set `MODEL_URL` to `'../../../models/gesture_recognizer.task'`.
- Custom labels come back in `result.gestures` in place of the built-in ones.

## Library and docs links

- MediaPipe loading pattern after **Golan Levin**'s [mediapipe_2026!](https://editor.p5js.org/golan/sketches/0XkgzZGe8) (dynamic `import()` from a plain p5 sketch). His MediaPipe sketches are listed with credits in [p5 MediaPipe by Golan Levin](../../mediapipe-golan-levin/).
- [MediaPipe Gesture Recognizer for web](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/web_js)
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision), pinned to 1.1.0.
- For hands without gestures, see [ml5-handpose](../../foundations/ml5-handpose/).

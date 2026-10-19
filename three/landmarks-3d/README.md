# Landmarks 3D

## What it does

Builds a 3D hand skeleton (joints and bones) from MediaPipe's hand landmarks and floats it over your real hand in a three.js scene. It tracks two hands. Pinch thumb and index together and the bones light up.

## Key data

MediaPipe's `HandLandmarker.detectForVideo()` returns each hand twice:

- `result.landmarks[h]`: 21 × `{ x, y, z }`, with x and y normalized (0–1) across the video. These give the position on screen.
- `result.worldLandmarks[h]`: the same 21 points **in meters**, centered on the hand (x right, y down, z away from the camera). These give the 3D shape.
- `result.handedness[h][0].categoryName`: `'Left'` or `'Right'`.

How the sketch combines them:

1. Convert world landmarks to three.js axes: `(x, -y, -z)`, with x flipped when the camera is mirrored.
2. **Distance:** `focal × realSpan / imageSpan`.
   - `realSpan` is wrist to middle knuckle in meters (about 8–10 cm).
   - `imageSpan` is the same in video pixels.
   - `focal` comes from `matchCameraToVideo()`.
3. **Direction:** the average image landmark, mapped to the screen with `cam.mapPoint()`, then unprojected into a ray from the three.js camera.
4. Place the hand group along that ray at that depth.

`pinch` is the thumb-tip to index-tip distance in meters. Under 3 cm lights up the bones.

Tested with a hand photo: joints projected to within 10–20 px of the 2D landmarks on a 1024 × 768 canvas.

## Desktop

- Any browser with WebGL2 (MediaPipe's GPU delegate), with a CPU fallback.
- Mirrored webcam. The skeleton mirrors to match.
- The distance depends on `CAMERA_FOV_DEGREES` (60) being close to your webcam's real field of view.

## Phone

- Front camera. Hold the phone at arm's length.
- About 8 MB of hand model plus about 13 MB of MediaPipe wasm, which compresses in transit. Use Wi‑Fi the first time.

## Library and docs links

- MediaPipe loading pattern after **Golan Levin**'s [mediapipe_2026!](https://editor.p5js.org/golan/sketches/0XkgzZGe8) (a dynamic `import()` from a plain, non-module script, here in a three.js page). His MediaPipe sketches are listed with credits in [p5 MediaPipe by Golan Levin](../../p5/mediapipe-golan-levin/).
- [MediaPipe Hand Landmarker for web](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js), loaded with a dynamic `import()` of `@mediapipe/tasks-vision@1.1.0`.
- [three-phone](https://github.com/npuckett/three-phone). Its [ml5 two-points examples](https://github.com/npuckett/three-phone/tree/main/examples/ml5) draw 2D landmarks in an orthographic overlay.
- 2D hand tracking in p5: [ml5-handpose](../../p5/foundations/ml5-handpose/) and [mp-gesture-recognizer](../../p5/detection/mp-gesture-recognizer/).

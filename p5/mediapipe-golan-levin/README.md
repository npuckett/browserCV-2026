# p5 MediaPipe by Golan Levin

[Golan Levin](https://www.flong.com) (Carnegie Mellon University) publishes p5.js sketches that use Google's MediaPipe directly, with no wrapper library in between. They are among the most approachable ways into body, hand and face tracking. Open one in the p5.js Web Editor, press play, and the landmarks arrive as ordinary p5 variables (`handLandmarks`, `poseLandmarks`, `faceLandmarks`), ready to draw with.

These sketches are Golan's. This page links to the originals in the Web Editor and credits everyone named in the code. Nothing is copied into this repository, because the sketches don't state a license. Ask Golan before redistributing them.

- **Type:** MediaPipe landmark tracking (hands, body, face, face metrics, body silhouette) in plain p5.js.
- **Good for:** the quickest start. No install, a single tracker file, and named examples such as a clown nose, a "thumb plum" and jaw openness to copy from.
- **Limits:**
  - Built for a laptop webcam: a fixed 640 × 480 canvas, the browser's default camera, no front/rear switch and no phone permission flow.
  - Running several trackers at once slows things down.
  - The 2023–2024 sketches need a one-line fix to load today (see below).

## The sketches

| Sketch | Author and credits | What it shows | Tracks | p5 / MediaPipe | Status (2026-10-09) |
| --- | --- | --- | --- | --- | --- |
| [mediapipe_2026!](https://editor.p5js.org/golan/sketches/0XkgzZGe8) · [full screen](https://editor.p5js.org/golan/full/0XkgzZGe8) | Golan Levin, rev. 2026-08-14. Contour tracing by [Lingdong Huang](https://gist.github.com/LingDong-/b99cdbe814e600d8152c0eefeef01ab3) (Frank-Ratchye STUDIO for Creative Inquiry) | Hands, body and face in one tracker, with checkboxes. Examples: a clown nose on the face, a "thumb plum" on the hand, jaw openness from face metrics, and the body silhouette as contours | Hand, Pose (with segmentation), Face (with blendshapes) | 2.3.2 / 1.0.0 | ✅ Loads and starts all three trackers |
| [mediapipe_in_p5_2023](https://editor.p5js.org/golan/sketches/0yyu6uEwM) | Golan Levin, 2023-10-29. Global-mode fix by [Orr Kislev](https://editor.p5js.org/orrkislev/sketches/wwLqrnVDt) | The earlier version: choose hands, body and/or face in a `trackingConfig` object | Hand, Pose, Face | 1.8.0 / 0.10.7 | ⚠️ Needs the import fix |
| [face-boundingbox-extractor](https://editor.p5js.org/golan/sketches/6Bamorob_) | Golan Levin, 2023–2024 (with Orr Kislev's fix) | Finds the face and lifts its rectangle out of the video, with the face points drawn | Face (Hand, Pose optional) | 1.8.0 / 0.10.7 | ⚠️ Needs the import fix |
| [face-mesh-extractor](https://editor.p5js.org/golan/sketches/LKOgI3QXd9) | Golan Levin, 2024-02-28 | Rebuilds the face from textured triangles cut out of the video | Face (with blendshapes) | 1.9.0 / 0.10.7 | ⚠️ Needs the import fix |
| [mediapipe_posetrack_videofile_2024](https://editor.p5js.org/golan/sketches/QQvFM8Y8A) | Golan Levin, 2024-04 | Body tracking on a video file instead of the webcam, for up to four people | Pose | 1.9.2 / 0.10.12 | ⚠️ Needs the import fix |

Also public: [mediapipe-facemesh-osc](https://editor.p5js.org/golan/sketches/Vws4HUS2i) (2024), face points meant for sending over OSC. Its header marks the OSC part as not yet implemented.

Golan's earlier tracking sketches (ml5, handsfree.js, BRFv4, clmtrackr, PoseNet, 2019–2024) are on his [Web Editor page](https://editor.p5js.org/golan/sketches).

### Why the older sketches stop at load, and the fix

The 2023–2024 sketches load MediaPipe with an unversioned URL:

```js
await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js');
```

That URL now resolves to tasks-vision 1.1.0. Since 1.0, `vision_bundle.js` is a classic script, not an ES module, so `import()` returns nothing. The sketch then fails with `Cannot read properties of undefined (reading 'forVisionTasks')`. This was checked on 2026-10-09 with `mediapipe_in_p5_2023`.

**Fix:** in a copy of the sketch, change that one line to the module file of the version the sketch already uses for its wasm:

```js
// sketches that load .../tasks-vision@0.10.7/wasm
await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.7/vision_bundle.mjs');
// sketches that load .../tasks-vision@0.10.12/wasm
await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/vision_bundle.mjs');
```

Both URLs were tested and export `FilesetResolver` and the landmarkers. Pinning a version in the import also stops this from happening again. `mediapipe_2026!` already does this (`@1.0.0/vision_bundle.mjs`).

## Using them

- **Desktop:** open the sketch, press play, and allow the camera. Golan's notes in the code suggest:
  - Enable only the trackers you need. Hands **or** body **or** face runs smoothest.
  - Turn off macOS camera "Reactions", which can trigger on gestures.
- **Phone:** open the **full screen** link (`editor.p5js.org/golan/full/<id>`). The sketch uses the default camera (the front camera on most phones) and a 640 × 480 canvas, so it works but isn't laid out for phones. For phone-first versions with a rear-camera switch and a tap-to-start flow, see the repository examples below.
- **The data:** each tracker's result is a global, filled every frame:
  - `handLandmarks`, `poseLandmarks` and `faceLandmarks` hold MediaPipe's results. Their landmark positions are normalized from 0 to 1.
  - In `mediapipe_2026!`, `poseContours` holds the body outline.
  - Face metrics are MediaPipe's blendshapes, such as `jawOpen`.

## How this repository builds on them

The loading pattern in these sketches is used by every MediaPipe example in this repository:

1. a dynamic `import()` of the tasks-vision ES module from a plain global-mode p5 sketch,
2. then `FilesetResolver.forVisionTasks()`,
3. then `createFromOptions()`,
4. then `detectForVideo()` once per new video frame.

Those examples are [mp-object-detector](../detection/mp-object-detector/), [mp-gesture-recognizer](../detection/mp-gesture-recognizer/), [mp-image-similarity](../detection/mp-image-similarity/), [mp-interactive-segmenter](../segmentation/mp-interactive-segmenter/) and [three/landmarks-3d](../../three/landmarks-3d/). They cover MediaPipe tasks that Golan's sketches don't (objects, gestures, image similarity, tap-to-segment) and add p5-phone's camera handling for phones. The same pattern loads YOLO and Transformers.js in the other examples.

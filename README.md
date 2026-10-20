# Computer Vision with JavaScript (2026)

Computer vision examples that run in the browser, on a laptop and on a phone. Most are [p5.js](https://p5js.org) sketches; a [three.js](https://threejs.org) section puts the results into 3D. Every example is one folder with an `index.html`, a `sketch.js` and a README that explains the data it uses and what changes between desktop and phone.

The camera, permission and phone-handling code comes from two companion libraries: [p5-phone](https://github.com/npuckett/p5-phone) for the p5 examples and [three-phone](https://github.com/npuckett/three-phone) for the three.js ones. Their `PhoneCamera` handles front/rear cameras, mirroring, fitting the video to the screen, and mapping results back onto it, so these examples can focus on the vision part.

## Running the examples

Camera access needs a secure page: `https://` or `localhost`.

- **On GitHub Pages**: turn on Pages for this repository and open any example folder. Each p5 example shows a QR code on desktop (from p5-phone's `showDesktopQr()`); scan it to open the same example on a phone.
- **Locally**: from the repository folder, run a static server and open `http://localhost:8766/`:

  ```bash
  npx http-server . -p 8766 -c-1
  ```

  Phones can't use `localhost` on your computer, and plain `http://` from another device has no camera access. Use GitHub Pages (or an HTTPS tunnel) to test on a phone.

- **In the p5.js Web Editor**: copy `index.html` and `sketch.js`, upload the files from [`shared/`](shared/) that the `index.html` loads, and change their `<script src>` paths to the file names. Some features can't run in the editor's preview frame; the example READMEs say which.

## Examples

Download sizes are for the first visit; browsers cache them afterwards. "WebGPU" means the example is much faster with it (desktop Chrome/Edge, iOS 26 Safari, recent Android Chrome) and falls back to the CPU or explains what's missing. Each section starts with a note on what that kind of computer vision is good for and where it runs out.

### p5.js

#### p5 MediaPipe by Golan Levin

- **Type:** MediaPipe landmark tracking (hands, body, face, face metrics, body silhouette) in plain p5.js, straight from the Web Editor.
- **Good for:** the most accessible starting point: press play in the editor, and landmarks arrive as ordinary p5 variables, with ready-made examples such as a clown nose and jaw openness.
- **Limits:** built for a laptop webcam (fixed 640 × 480 canvas, default camera, no phone permission flow); the 2023–2024 sketches need a one-line import fix to load today.

These are Golan Levin's sketches, linked in place; nothing is copied here. Credits, versions and the fix are on the [section page](p5/mediapipe-golan-levin/).

| Sketch | Author | What it shows | Notes |
| --- | --- | --- | --- |
| [mediapipe_2026!](https://editor.p5js.org/golan/sketches/0XkgzZGe8) | Golan Levin; contours by Lingdong Huang | Hands, body and face in one tracker: clown nose, "thumb plum", jaw openness, body silhouette | p5 2.3.2 · works as published |
| [mediapipe_in_p5_2023](https://editor.p5js.org/golan/sketches/0yyu6uEwM) | Golan Levin; global-mode fix by Orr Kislev | The earlier hands/body/face tracker with a config object | Needs the [import fix](p5/mediapipe-golan-levin/#why-the-older-sketches-stop-at-load-and-the-fix) |
| [face-boundingbox-extractor](https://editor.p5js.org/golan/sketches/6Bamorob_) | Golan Levin; fix by Orr Kislev | Lifts the face's rectangle out of the video | Needs the import fix |
| [face-mesh-extractor](https://editor.p5js.org/golan/sketches/LKOgI3QXd9) | Golan Levin | The face rebuilt from textured triangles | Needs the import fix |
| [mediapipe_posetrack_videofile_2024](https://editor.p5js.org/golan/sketches/QQvFM8Y8A) | Golan Levin | Body tracking on a video file, up to four people | Needs the import fix |

#### Foundations

- **Type:** pixel methods (reading color, brightness and change straight from the camera's pixels) and ml5.js (friendly wrappers around pretrained body, hand, face and depth models).
- **Good for:** pixel methods are instant, download nothing and are easy to understand, which suits controlled setups (a bright object, a flashlight, a still camera). ml5 gives body, hand and face points in a few lines of code.
- **Limits:** pixel methods see colors and changes, not things, so lighting, clutter and camera movement throw them off. ml5 models track one kind of thing each, download several MB, and work best with one person facing the camera.

| Example | Author | What it does | Download | Notes |
| --- | --- | --- | --- | --- |
| [color-tracking](p5/foundations/color-tracking/) | Nick Puckett, from p5-phone | Tap a color, track where it is | ~1 MB | No model |
| [brightness-tracking](p5/foundations/brightness-tracking/) | Nick Puckett, after Golan Levin's Processing example | Follow the brightest spot (a flashlight) | ~1 MB | No model |
| [motion-detection](p5/foundations/motion-detection/) | Nick Puckett, after Golan Levin's Processing example | Frame differencing: what moved | ~1 MB | Keep the camera still |
| [ml5-handpose](p5/foundations/ml5-handpose/) | Nick Puckett, from p5-phone | 21 hand points, pinch distance | ~15 MB | Front camera |
| [ml5-facemesh](p5/foundations/ml5-facemesh/) | Nick Puckett, from p5-phone | 468 face points, mouth openness | ~10 MB | Front camera |
| [ml5-bodypose](p5/foundations/ml5-bodypose/) | Nick Puckett, from p5-phone | 33-point skeleton, arms up | ~12 MB | Step back |
| [ml5-depth](p5/foundations/ml5-depth/) | Nick Puckett | Portrait depth map | ~11 MB | Portraits only |

#### Detection and tracking

- **Type:** object detection (boxes and labels around known kinds of things), plus two related MediaPipe tasks: gesture recognition and image similarity.
- **Good for:** finding and counting everyday objects (the 80 COCO classes) or classes you train yourself, and using gestures or "which of these is it?" comparisons as input.
- **Limits:** a detector only knows the classes it was trained on and gives boxes, not outlines; small or distant objects are missed. YOLO wants WebGPU for speed and is AGPL-3.0 licensed.

| Example | Author | What it does | Download | Notes |
| --- | --- | --- | --- | --- |
| [yolo-detect](p5/detection/yolo-detect/) | Nick Puckett | 80 everyday objects; "is there a cup, and where?" | ~16 MB | WebGPU · AGPL-3.0 |
| [yolo-pose](p5/detection/yolo-pose/) | Nick Puckett | Skeletons for everyone in view | ~18 MB | WebGPU · AGPL-3.0 |
| [yolo-custom](p5/detection/yolo-custom/) | Nick Puckett | Template for your own trained model, with Colab steps | ~16 MB | Load .onnx from disk |
| [mp-object-detector](p5/detection/mp-object-detector/) | Nick Puckett, loading after Golan Levin | MediaPipe object detection, no WebGPU needed | ~7 MB + wasm | Widest support |
| [mp-gesture-recognizer](p5/detection/mp-gesture-recognizer/) | Nick Puckett, loading after Golan Levin | Gestures as controls: draw in the air | ~8 MB + wasm | Front camera |
| [mp-image-similarity](p5/detection/mp-image-similarity/) | Nick Puckett, loading after Golan Levin | "Which saved view is this?" with embeddings | ~4 MB + wasm | No training |

#### Markers

- **Type:** fiducial markers: printed codes (ArUco, AprilTag, QR) designed to be found by a camera.
- **Good for:** the most dependable tracking here. Each marker gives an exact id, position and rotation, with no model download, and it runs the same on old phones.
- **Limits:** you have to print and place them; they must be flat, unobstructed (white border included), reasonably lit and big enough in the frame.

| Example | Author | What it does | Download | Notes |
| --- | --- | --- | --- | --- |
| [aruco-markers](p5/markers/aruco-markers/) | Nick Puckett | Printed markers as knobs and switches | ~40 KB | Plain JavaScript |
| [apriltag-detect](p5/markers/apriltag-detect/) | Nick Puckett | Sturdy AprilTags with distance | ~200 KB | WebAssembly worker |
| [qr-markers](p5/markers/qr-markers/) | Nick Puckett | QR codes as markers; their text is the meaning | ~1 MB on some browsers | Several codes at once |

Printable sheets: [ArUco](markers/print-aruco.html), [AprilTag](markers/print-apriltag.html), [QR](markers/print-qr.html). See [markers/](markers/).

#### Segmentation

- **Type:** segmentation: deciding, pixel by pixel, which parts of the image belong to an object.
- **Good for:** cutouts, outlines, measuring how much of the frame something covers, and effects that follow a shape.
- **Limits:** heavier than detection and ragged at the edges. YOLO merges all masks into one image. The tap-to-select tools work on still frames or re-segment every frame rather than truly tracking.

| Example | Author | What it does | Download | Notes |
| --- | --- | --- | --- | --- |
| [yolo-segment](p5/segmentation/yolo-segment/) | Nick Puckett | Outlines of every object found | ~17 MB | WebGPU · AGPL-3.0 |
| [mp-interactive-segmenter](p5/segmentation/mp-interactive-segmenter/) | Nick Puckett, loading after Golan Levin | Tap anything to cut it out; refine with +/− | ~30 MB + wasm | Still frames |
| [click-to-track](p5/segmentation/click-to-track/) | Nick Puckett | Tap an object and follow it (EdgeTAM) | ~20 MB | WebGPU · experimental |

#### Depth

- **Type:** monocular depth estimation: guessing distance for every pixel from a single camera image.
- **Good for:** 3D effects, separating near from far, displacement meshes and point clouds from an ordinary camera.
- **Limits:** depth is relative (nearer or farther within one frame), not meters; it flickers between frames; the models are heavy, so phones are best effort.

| Example | Author | What it does | Download | Notes |
| --- | --- | --- | --- | --- |
| [depth-map](p5/depth/depth-map/) | Nick Puckett, after Joshua Lochner's (Xenova) WebGPU depth demo | Depth Anything V2 as a map and a WEBGL mesh | 26–94 MB | WebGPU · heavy on phones |

#### Vision and language

- **Type:** vision-language models: describe the image or answer questions about it in words.
- **Good for:** open-ended description, slow and reflective pieces, captions, and questions nobody trained a detector for.
- **Limits:** 1–2 seconds per answer, big downloads (or desktop Chrome only); they can be confidently wrong, and the output is text, not coordinates.

| Example | Author | What it does | Download | Notes |
| --- | --- | --- | --- | --- |
| [live-caption](p5/language/live-caption/) | Nick Puckett, after Apple's FastVLM WebGPU demo | FastVLM describes the camera, 1–2 s per caption | ~770 MB | WebGPU + f16 · desktop first |
| [ask-the-camera](p5/language/ask-the-camera/) | Nick Puckett | Ask Chrome's built-in model about the frame | model managed by Chrome | Desktop Chrome 148+ only |

### three.js

- **Type:** computer-vision results placed in a 3D scene: AR objects on markers and images, and 3D views of landmarks, depth and detections.
- **Good for:** objects that sit on a printed marker or image, 3D visualization of tracked bodies and depth, and AR-style scenes built on three-phone.
- **Limits:** pose needs the camera's field of view, which is estimated here; magic-window AR follows rotation only, not walking around; full world tracking (WebXR) is Android-only.

| Example | Author | What it does | Download | Notes |
| --- | --- | --- | --- | --- |
| [aruco-pose](three/aruco-pose/) | Nick Puckett, POSIT conversion after js-aruco2's sample | A cube sitting on each printed marker | ~1 MB | Pose verified in testing |
| [apriltag-pose](three/apriltag-pose/) | Nick Puckett | 3D objects on AprilTags from camera intrinsics | ~1 MB | Pose verified in testing |
| [landmarks-3d](three/landmarks-3d/) | Nick Puckett, loading after Golan Levin | A 3D hand skeleton from MediaPipe world landmarks | ~8 MB + wasm | Front camera |
| [depth-pointcloud](three/depth-pointcloud/) | Nick Puckett | The camera image as a 3D point cloud | 26–94 MB | WebGPU |
| [yolo-in-space](three/yolo-in-space/) | Nick Puckett, after three-phone's tap-to-place | Detections pinned around you (magic-window AR) | ~16 MB | Best on a phone |
| [image-target](three/image-target/) | Nick Puckett, after MindAR's example | MindAR: 3D content on a printed image | ~2 MB | Unconfirmed, see its README |

## Desktop and phone

| | Desktop | Phone |
| --- | --- | --- |
| **Secure page** | `https://` or `localhost` | `https://` only (GitHub Pages works) |
| **Camera** | Webcam faces you; examples mirror it like a mirror | Rear camera for objects and markers, front for faces and hands; a button switches when there are two |
| **Starting** | Click the start overlay | Tap the start overlay (iOS only allows camera and motion from a tap) |
| **Input** | Mouse and keyboard | Touch; every example accepts both (p5's `mousePressed()` covers mouse and touch) |
| **WebGPU** | On by default in Chrome and Edge | iOS 26 Safari, Chrome on Android 12+; without it, models fall back to much slower CPU code |
| **Downloads** | Fine to try larger models (YOLO small/medium) | Prefer nano models and Wi‑Fi; model files are tens of MB |
| **Speed** | Most examples run at camera rate | Examples downscale frames before detection; expect lower rates for heavy models |

General notes:

- Webcams deliver about 30 frames a second while `draw()` runs at 60. `isNewFrame(cam)` in [`shared/frame.js`](shared/frame.js) skips the repeats, which keeps detectors from doing double work and frame differencing from comparing a frame with itself.
- 3D pose examples don't mirror the desktop webcam, because 3D objects have to match the real image.
- Phones get warm and throttle during long sessions with heavy models.

## Repository layout

```
README.md            this page
docs/                verified-apis.md: library versions and API facts checked for this repo
shared/              helpers used by the examples (see below)
p5/
  mediapipe-golan-levin/  links and credits for Golan Levin's MediaPipe sketches
  foundations/       pixel methods and ml5
  detection/         YOLO, MediaPipe object detector, gestures, image similarity
  markers/           ArUco, AprilTag, QR
  segmentation/      YOLO segment, MediaPipe interactive segmenter, EdgeTAM click-to-track
  depth/             Depth Anything V2
  language/          FastVLM captions, Chrome Prompt API
three/               pose, landmarks, point cloud, detections in space, image targets
models/              same-origin YOLO26 .onnx files
markers/             printable ArUco, AprilTag and QR sheets
vendor/apriltag/     AprilTag WebAssembly build (must be same-origin)
```

### shared/

| File | For | What it adds |
| --- | --- | --- |
| [frame.js](shared/frame.js) | p5 (most functions also in three.js pages) | `drawPhoneCamera()`, `grabFrame()` (downscaled ImageData), `mapFramePoint()`, `canvasToVideo()`, `drawOverCamera()`, `isNewFrame()` |
| [camera-switch.js](shared/camera-switch.js) | p5 | Front/rear camera button for a `PhoneCamera`, adapted from p5-phone's ml5 examples |
| [loading.js](shared/loading.js) | p5 | Spinner, progress bar and error panel drawn on the canvas, adapted from p5-phone's `ml5-loading.js` |
| [status-overlay.js](shared/status-overlay.js) | three.js | The same, as a page overlay, plus `showCameraOff()` for when the camera does not start |
| [three-helpers.js](shared/three-helpers.js) | three.js | `matchCameraToVideo()`, `makeLabel()`, `IS_PHONE` |

## Writing a new example

Copy the closest example and keep its shape:

- `index.html` loads pinned versions (see [docs/verified-apis.md](docs/verified-apis.md)) and the `shared/` files it needs. three.js pages follow three-phone's order: three-phone script, import map, then a module loader that sets `window.THREE` and adds the plain `sketch.js`.
- ES-module libraries (MediaPipe, YOLO, Transformers.js, OrbitControls, MindAR) load with a dynamic `import()` from the plain sketch, the pattern from [Golan Levin's MediaPipe sketch](https://editor.p5js.org/golan/sketches/0XkgzZGe8). Start loading in `setup()` without awaiting it, so `draw()` can show progress.
- Keep one async detection in flight (`busy`), and start it only for new frames (`isNewFrame()`).
- Map results from video pixels to the canvas with `cam.mapPoint()` / `mapKeypoint()` / `mapBox()` or `mapFramePoint()`; they handle the fit mode and the mirror.
- Avoid top-level names that p5 already uses. `model`, `describe`, `hue`, `loadModel` and `text` are all p5 functions: a top-level `function describe()` stops the sketch, and `let model` hides `model()`.
- In p5 2.x an error inside `draw()` stops the loop for good. Guard sizes that can be 0 (a hidden window reports 0 × 0).
- README sections: **What it does · Key data · Desktop · Phone · Library and docs links**.

## Libraries and licenses

This repository's own code is meant to be reused. The libraries keep their own licenses:

| Library | License | Used in |
| --- | --- | --- |
| p5.js, ml5.js | LGPL-2.1, MIT | p5 examples |
| p5-phone, three-phone | MIT | all examples |
| Golan Levin's MediaPipe sketches | no license stated in the sketches; linked, not copied | [p5 MediaPipe by Golan Levin](p5/mediapipe-golan-levin/) |
| three.js | MIT | three examples |
| **@ultralytics/yolo and YOLO26 models** | **AGPL-3.0** (or an Ultralytics Enterprise License) | yolo-*, yolo-in-space |
| @mediapipe/tasks-vision | Apache-2.0 | mp-*, landmarks-3d |
| Transformers.js, Depth Anything V2 small, EdgeTAM | Apache-2.0 | depth, click-to-track |
| FastVLM | Apple Machine Learning Research Model License (`apple-amlr`: research use; read it before other uses) | live-caption |
| js-aruco2 | MIT | aruco-* |
| apriltag-js-standalone | BSD-3-Clause | apriltag-* |
| barcode-detector (zxing-wasm) | MIT | qr-markers |
| MindAR | MIT | image-target |

Using the YOLO examples in a project means following AGPL-3.0 for that project. The ONNX Runtime Web build that `@ultralytics/yolo` loads sends the page's hostname to its maintainers on first use (not on `localhost`); see [yolo-detect](p5/detection/yolo-detect/README.md#library-and-docs-links).

## Testing status

Every example was run in desktop Chromium (Chrome 152 engine, macOS, WebGPU) with a simulated camera: a canvas stream showing test images, generated markers and moving shapes. Detections, mappings and poses were checked numerically, for example that 3D objects project onto marker centers and that AprilTag distances match the geometry.

Not yet tested:

- **Phones.** Phone notes come from the libraries' documentation and the desktop measurements, not from devices.
- **ask-the-camera's prompt.** It was checked up to `LanguageModel.availability()`; running a prompt would download Chrome's multi-gigabyte model.
- **image-target.** MindAR started but didn't detect the target in the test browser (details in its README).

## Not recommended

- **OpenCV.js for ArUco**: the standard build doesn't include the ArUco module; it needs a custom build. js-aruco2 and the AprilTag wasm build cover the same ground.
- **Human (vladmandic/human)**: no GitHub activity since December 2023.
- **jsQR for multiple QR codes**: in testing it returned nothing when two different codes were in view; see [qr-markers](p5/markers/qr-markers/).

## Keeping it current

Library facts were checked in October 2026 and are recorded with sources and test results in [docs/verified-apis.md](docs/verified-apis.md). Several libraries here release often (`@ultralytics/yolo` released eight versions in a month), so versions are pinned; re-check that file before bumping one.

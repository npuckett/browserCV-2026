# YOLO detect

## What it does

Finds the 80 everyday COCO objects (people, cups, phones, chairs, dogs and so on) in the live camera image with Ultralytics YOLO26 nano. Boxes and labels are drawn in p5. A small `detections` array answers questions like "is there a cup, and where?". Tap to change the object it looks for.

## Key data

- `results.boxes`: `[{ x1, y1, x2, y2, conf, cls, name, color }]` from `model.predict()`. Coordinates are in video pixels (`videoWidth` × `videoHeight`), and `color` is a `#rrggbb` string per class.
- `results.speed`: `{ preprocess, inference, postprocess }` in milliseconds.
- `detections`: the same boxes converted to canvas pixels with `cam.mapPoint()`: `{ label, confidence, x, y, w, h, centerX, centerY }`.
- `findObject(label)`: the most confident detection with that label, or `null`.

Notes on the code:

- The library is an ES module, so the sketch loads it with a dynamic `import()` inside `loadYolo()`. That lets a classic global-mode sketch use it, the same pattern as [Golan Levin's MediaPipe sketch](https://editor.p5js.org/golan/sketches/0XkgzZGe8).
- `predict()` is async. The sketch keeps one prediction in flight (`busy`) and only starts another when the camera has a new frame (`isNewFrame()`), so `draw()` never waits.
- The sketch reads `model.device` once, right after loading. Reading a model property while `predict()` runs throws "recursive use of an object" from the wasm side.

## Desktop

- Chrome and Edge use WebGPU, which is on by default. Measured on an M-series Mac: about 40 ms per frame. Firefox and older Safari fall back to the CPU, which is several times slower.
- The webcam is mirrored, and `cam.mapPoint()` mirrors the boxes to match.
- Desktop can run larger models. Export `yolo26s` or `yolo26m` (see [yolo-custom](../yolo-custom/)), put the file in `models/`, and change `MODEL_URL`.

## Phone

- Starts on the rear camera.
- iOS 26 Safari and recent Android Chrome have WebGPU. Phones without it fall back to the CPU and run far slower. The panel shows which one is in use.
- First load downloads about 16 MB: the 10 MB model and a roughly 6 MB compressed ONNX Runtime from `cdn.pyke.io`. Use Wi‑Fi. Both are cached afterwards (the runtime for 8 hours).
- Stay with the nano model on phones.

## Library and docs links

- [@ultralytics/yolo for the web](https://github.com/ultralytics/inference/tree/main/web), pinned to 0.0.51.
- [YOLO26 docs](https://docs.ultralytics.com/models/yolo26/) and [COCO class list](https://docs.ultralytics.com/datasets/detect/coco/)
- The model file `models/yolo26n.onnx` is the official export from the [Ultralytics assets release v8.4.0](https://github.com/ultralytics/assets/releases/tag/v8.4.0). GitHub release URLs don't send CORS headers, so this repo serves a copy from its own origin.
- **License:** the library and models are AGPL-3.0. Projects that use them must be AGPL-3.0 too, or need an [Ultralytics Enterprise License](https://www.ultralytics.com/license).
- **Telemetry:** on its first session, ONNX Runtime Web sends the page's hostname to `signal.pyke.io`. It skips `localhost`, and there is no JavaScript option to turn it off. A Content-Security-Policy `connect-src` that leaves out `signal.pyke.io` blocks it.

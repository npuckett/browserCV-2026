# MediaPipe object detector

## What it does

Finds the 80 COCO objects with MediaPipe's ObjectDetector and the EfficientDet-Lite0 model, drawing boxes and a running count ("2 person, 1 cup"). It uses MediaPipe Tasks directly rather than through ml5.

Compared with [yolo-detect](../yolo-detect/), it is a smaller download and runs on WebGL, so it works in browsers without WebGPU. It is less accurate on small objects.

## Key data

- `result.detections`: `[{ categories: [{ categoryName, score, index }], boundingBox: { originX, originY, width, height } }]`. Boxes are in video pixels.
- `counts`: `{ person: 2, cup: 1 }` for the current frame.
- Options: `scoreThreshold: 0.4` (ignore weaker detections), `maxResults: 10`, `runningMode: 'VIDEO'`.

The loading pattern used by all the MediaPipe examples:

```js
const { ObjectDetector, FilesetResolver } = await import(MP_URL + '/vision_bundle.mjs');
const vision = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');
detector = await ObjectDetector.createFromOptions(vision, options); // GPU, or CPU on failure
// every new camera frame:
result = detector.detectForVideo(cam.videoElement, timestamp);
```

- Since tasks-vision 1.0, import `vision_bundle.mjs`. The `.js` bundle is not a module.
- Keep the JS and wasm versions the same.
- Timestamps passed to `detectForVideo` must strictly increase.
- `detectForVideo` is synchronous and blocks `draw()` while it runs.

## Desktop

- Any current browser with WebGL2. The GPU delegate runs on WebGL. If creating it fails, the sketch retries with the CPU, and the panel shows which one is in use.
- Fast on laptops: a few milliseconds per frame.

## Phone

- Starts on the rear camera.
- About 7 MB (the float16 model) plus 13 MB of MediaPipe wasm, which compresses in transit. Use Wi‑Fi the first time.
- Works on phones without WebGPU, which makes it the most widely supported detector here.
- There are open MediaPipe reports of GPU-delegate problems in some iOS Safari versions. If boxes look wrong, change `delegate` to `'CPU'`.

## Library and docs links

- MediaPipe loading pattern after **Golan Levin**'s [mediapipe_2026!](https://editor.p5js.org/golan/sketches/0XkgzZGe8) (dynamic `import()` from a plain p5 sketch). His MediaPipe sketches are listed with credits in [p5 MediaPipe by Golan Levin](../../mediapipe-golan-levin/).
- [MediaPipe Object Detector for web](https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector/web_js)
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision), pinned to 1.1.0.
- Custom objects: Google's [Model Maker object detector guide](https://ai.google.dev/edge/mediapipe/solutions/customization/object_detector). Model Maker is still available but no longer maintained. For new custom-object work, [yolo-custom](../yolo-custom/) is the better-supported route.
- Models are loaded from `storage.googleapis.com`, which allows cross-origin loading. To self-host, download the `.tflite` into `models/` and change `MODEL_URL`.

# Verified library notes

Checked on 2026-10-08 against the published packages, their source files and their docs. Pinned versions in the examples match this page. When a library updates, re-check the items marked here before bumping a version.

## Versions used

| Library | Version | Loaded as |
| --- | --- | --- |
| p5.js | 2.2.3 | `<script>` (same pin as p5-phone) |
| p5-phone | 1.15.4 | `<script>` |
| three.js | 0.185.1 | import map (same pin as three-phone) |
| three-phone | 0.2.0 | `<script>` |
| ml5.js | 1.4.0 | `<script>` |
| @ultralytics/yolo | 0.0.51 | dynamic `import()` |
| @mediapipe/tasks-vision | 1.1.0 | dynamic `import()` of `vision_bundle.mjs` |
| js-aruco2 | 2.0.0 | `<script>` (classic scripts, order matters) |
| apriltag-js-standalone | 2021 wasm build | vendored in `vendor/apriltag/` |
| barcode-detector (ponyfill) | 3.2.2 | `<script>` (IIFE) |
| @huggingface/transformers | 4.3.1 | dynamic `import()` |
| mind-ar | 1.2.5 | import map with a three.js compat shim |

## p5-phone and three-phone

- `PhoneCamera.onReady(cb)` stores one callback. A second call replaces the first, so shared helpers must not use it.
- three-phone 0.2.0 calls a global `userSetupComplete()` after the camera tap. It does this even when the camera did not start: refused, missing, or no `getUserMedia`. `window.cameraEnabled` is false then. three-phone only logs `PhoneCamera init failed: ...` and removes its tap overlay, so the page goes blank unless it shows a message of its own. `showCameraOff()` in `shared/status-overlay.js` is that message.
- With p5.js 2.2.3, `image(cam, ...)` draws correctly but logs a friendly-error warning on every frame. The examples draw the feed with `drawPhoneCamera(cam)` from `shared/frame.js`, the same helper p5-phone's ml5 examples use.
- Enabling the camera logs one friendly-error warning about `createCapture()`'s second parameter. It is harmless.
- In three.js pages (no p5), ml5 constructors return a Promise: `model = await ml5.handPose(options)`. In p5 sketches, start detection from ml5's ready callback.

## ml5.js 1.4.0

- `ml5.depthEstimation(options, callback)` wraps TensorFlow's ARPortraitDepth. It is trained on portraits and expects one person filling the frame. Options include `minDepth`, `maxDepth`, `normalizeDynamically`, `flipHorizontal`, `colormap`, `targetFps`, `applySegmentationMask` (masks out the background, which runs a second model), `dilationFactor`. Continuous use is `estimateStart(media, callback)` and `estimateStop()`. A result has `image` (a p5.Image), `data` (a 2D array), `width`, `height`, `minDepth`, `maxDepth`, `getDepthAt(x, y)` and `mask`.

## @ultralytics/yolo 0.0.51

- Import: `await import('https://cdn.jsdelivr.net/npm/@ultralytics/yolo@0.0.51/+esm')` (esm.sh also works). The package releases often, so keep it pinned.
- `YOLO.load(source, { device: 'auto' | 'webgpu' | 'cpu', wasmUrl, ortBaseUrl })`. A string source is fetched as a URL. There are no confidence, IoU or size options at load time. The input size comes from the ONNX file, and the file must carry Ultralytics metadata.
- `model.predict(input, { conf: 0.25, iou: 0.7, classes })` accepts a `<video>`, canvas, ImageData, ImageBitmap or image. All coordinates are in source pixels (`videoWidth` by `videoHeight`).
- Result fields:
  - `boxes`: `[{ x1, y1, x2, y2, conf, cls, name, color }]`, where `color` is a `#rrggbb` string.
  - `keypoints`: `[{ points: [[x, y, conf], ...17], color }]`, in the same order as `boxes`.
  - `masks`: one merged RGBA overlay (`width * height * 4`, class colored), not one mask per object. It is an empty array for non-segment tasks.
  - `depth`: a colorized RGBA image, not raw depth values. `depth_range` gives meters.
  - Also: `task`, `width`, `height`, `probs`, `obb`, `speed`.
- `annotate(canvas, input, results)` resizes the canvas you pass. Don't give it p5's canvas.
- `predict()` calls are not queued, so keep one in flight at a time (a busy flag).
- ONNX Runtime Web 1.27.0 loads from `cdn.pyke.io`. WebGPU build: 26.8 MB raw, 5.6 MB over the wire. CPU build: 13.5 MB raw, 3.1 MB over the wire. Cached for 8 hours.
- Telemetry: on its first session, ort-web sends a beacon with the page hostname to `signal.pyke.io`. It skips localhost. There is no JavaScript switch to turn it off. A Content-Security-Policy `connect-src` that leaves out `signal.pyke.io` blocks it.
- Models: the official Ultralytics assets release v8.4.0 has ready ONNX files with metadata (`yolo26n.onnx`, `-seg`, `-pose`, `-cls`, `-obb`, `-depth`). GitHub release URLs send no CORS headers, so `models/` holds same-origin copies.
- Export your own model with `ultralytics>=8.4.142`: `YOLO("best.pt").export(format="onnx")`, or add `quantize=16` for a half-size FP16 file.
- License: AGPL-3.0, or an Ultralytics Enterprise License.

## @mediapipe/tasks-vision 1.1.0

- Import the ES module bundle: `await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/vision_bundle.mjs')`. Since 1.0.0, `vision_bundle.js` is an IIFE, not a module.
- Wasm: `FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/wasm')`. Keep the JS and wasm versions identical.
- **Tested 2026-10-09:** the unversioned `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js` now resolves to 1.1.0's IIFE, and `import()` of it returns an empty module.
  - Sketches that used that line, including Golan Levin's 2023–2024 MediaPipe sketches, now fail with `Cannot read properties of undefined (reading 'forVisionTasks')`.
  - `@0.10.7/vision_bundle.mjs` and `@0.10.12/vision_bundle.mjs` import correctly. There was never a `vision_bundle.js` in 0.10.x.
  - Always pin the version and import the `.mjs`.
- Every call is synchronous and blocks the main thread. Video timestamps must strictly increase, and the video needs `readyState >= 2` and `videoWidth > 0`.
- `delegate: 'GPU'` means WebGL2. Fall back to `'CPU'` if creating the task throws.
- ObjectDetector: `detectForVideo(video, ms)` returns `{ detections: [{ categories: [{ score, categoryName }], boundingBox: { originX, originY, width, height } }] }`, with boxes in video pixels. Models: `efficientdet_lite0` float16 is 7.25 MB, int8 is 4.6 MB.
- GestureRecognizer: `recognizeForVideo(video, ms)` returns `{ gestures, handedness, landmarks, worldLandmarks }`. Landmarks are normalized 0 to 1. The built-in labels are None, Closed_Fist, Open_Palm, Pointing_Up, Thumb_Down, Thumb_Up, Victory and ILoveYou. The model is 8.37 MB.
- HolisticLandmarker is available in JS. It tracks one person and returns face, pose and left/right hand landmarks. The model is 13.7 MB.
- InteractiveSegmenter changed in 1.0.0. It is stateful: call `setImage(canvas)` once (the heavy step), then `segment([{ brushMode: 1, point: [{ x, y }], isCompleted: true }])` with normalized points. It returns an MPMask. Read it with `getAsFloat32Array()` and `close()` it afterwards. There is no video mode, so freeze a frame on tap. `BrushMode` is not exported at runtime, so use numbers: 1 = positive, 2 = negative. The model is 30.5 MB (int8, 768 px). CPU is faster than GPU for this model.
- ImageEmbedder: `embed(image)` or `embedForVideo(video, ms)` returns `embeddings[0]`. `ImageEmbedder.cosineSimilarity(a, b)` takes the embedding objects, not the float arrays. The mobilenet_v3_small model is 4.1 MB.
- Model Maker (customizing ObjectDetector and GestureRecognizer) is deprecated. It is still available, but no longer maintained. Its Colabs are still the documented route.
- Model files on storage.googleapis.com send `Access-Control-Allow-Origin: *`.

## js-aruco2 2.0.0

- Load as classic scripts, in this order: `cv.js`, `aruco.js`, any extra dictionary file, then `svd.js` and `posit1.js` for pose. This creates the globals `CV`, `AR`, `SVD` and `POS`.
- Built-in dictionaries are `ARUCO` and `ARUCO_MIP_36h12` (the default). Every other dictionary needs its own file from `src/dictionaries/`, for example `APRILTAG_36h11`.
- `new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 })`. The default tolerance is the dictionary's own tau (12 for MIP_36h12), which accepts false matches, so set it lower.
- `detector.detect(imageData)` returns `[{ id, corners: [{ x, y } x4], hammingDistance }]`. Corners run clockwise from the marker's own top-left.
- POSIT: `new POS.Posit(markerSizeMm, focalLengthPx)`, then `posit.pose(corners)`.
  - **Tested here:** with the three.js matrix `[r00, r01, -r02, t0; r10, r11, -r12, t1; -r20, -r21, r22, -t2]`, cubes projected to within 1 px of marker centers, and a 0.4 rad turn read as z = -0.404. Pass a copy of the corners centered on the image with y pointing up (`x - w/2`, `h/2 - y`). It returns `bestRotation` (3x3) and `bestTranslation` (in marker units, z in front of the camera). Prefer `posit1.js`, because `posit2.js` is LGPL-derived.
- Printable markers: `new AR.Dictionary('ARUCO_MIP_36h12').generateSVG(id)` returns an SVG with a viewBox only, so set its print size yourself.
- **Tested:** with `apriltag_36h11.js` loaded, `APRILTAG_36h11` read the official AprilRobotics tag images (ids 0 and 5) with Hamming distance 0. Its corner 0 is the tag's top-left, whereas the AprilTag library starts at the bottom-left.
- License: MIT.

## AprilTag (apriltag-js-standalone)

- The repo moved to `arenaxr/apriltag-js-standalone` (BSD-3-Clause). It isn't published to npm. The wasm was last rebuilt in 2021, and it detects the tag36h11 family only.
- It runs in a Web Worker through Comlink. The worker must be same-origin, so `vendor/apriltag/` holds `apriltag.js`, `apriltag_wasm.js` and `apriltag_wasm.wasm`. The vendored `apriltag.js` pins Comlink 4.4.2 (upstream loads it unpinned).
- `detect(grayUint8, width, height)` takes one byte per pixel. It returns `[{ id, corners, center, pose: { R, t, e, size } }]`.
  - `pose` is present only after `set_return_pose(1)`, and it needs `set_camera_info(fx, fy, cx, cy)` and `set_tag_size(id, meters)`.
  - `R` is column-major (`R[col][row]`), and `t` is in meters in OpenCV axes (x right, y down, z forward).
    - **Tested:** a tag rotated 0.5 rad clockwise on screen returned `R = [[0.878, 0.478, 0], [-0.478, 0.878, 0], [0, 0, 1]]`, the transpose of Rz(0.5).
    - A 60 mm tag drawn 160 px wide in a 640 px frame, with fx = 554 (60° FOV), returned z = 0.208 m, which is exactly fx × size / pixels.
  - Corners run counter-clockwise from the bottom-left. Tested: BL, BR, TR, TL on screen.
  - `size` sits inside `pose`, not at the top level.

## QR codes

- `BarcodeDetector` works in Chrome on Android and in Chrome and Edge on macOS and ChromeOS. It is not in Chrome on Windows or Linux, it is behind a flag in Safari, and Firefox doesn't have it. Feature-detect it with `getSupportedFormats()`.
- jsQR 1.4.0 is unmaintained but stable: `jsQR(data, width, height, { inversionAttempts: 'dontInvert' })`. Pass the options on every call, because jsQR mutates its shared defaults.
  - **Tested limitation:** with two different codes in one frame, jsQR returned `null`. Each code alone decoded fine.
- `barcode-detector` 3.2.2 is a ponyfill built on zxing-wasm, with the same API as the native class. Load `dist/iife/ponyfill.js` and use `new BarcodeDetectionAPI.BarcodeDetector({ formats: ['qr_code'] })`.
  - It found both codes in the same test frame, at about 5 ms per detect after a one-time 1 MB wasm download from jsDelivr.
  - `qr-markers` uses it as the fallback.

## Transformers.js 4.3.1

- v4.0.0 stable shipped 2026-03-30. WebGPU in Safari 26 works from 4.3.0, so don't go below that. Don't use the `@next` tag: it is stuck on a pre-release, and some Hugging Face demo Spaces still import it.
- Import: `await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1')`. At runtime it also fetches a 26.9 MB ONNX Runtime wasm file from jsDelivr.
- `dtype: 'fp16'` throws when the WebGPU adapter lacks `shader-f16`. Check `(await navigator.gpu.requestAdapter()).features.has('shader-f16')` and fall back to `'fp32'`.
- Image processors live at `processor.image_processor` (`feature_extractor` is undefined in v4). Pipelines accept a canvas, an OffscreenCanvas, a URL or a RawImage.
- Depth: `pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', { device: 'webgpu', dtype })` returns `{ predicted_depth, depth }`. `predicted_depth` is a float Tensor at input size; `depth` is a 0 to 255 RawImage.
  - Model sizes: fp32 99 MB, fp16 50 MB, q4f16 19 MB.
  - A 320x240 frame took about 130 ms on an M-series Mac.
- RF-DETR: `pipeline('object-detection', 'onnx-community/rfdetr_nano-ONNX', ...)`. The detector is called as `detector(canvas, { threshold, percentage: true })`.
- Vision-language models: there is no `image-text-to-text` pipeline. Use `AutoProcessor` and `AutoModelForImageTextToText`.
  - FastVLM 0.5B (`onnx-community/FastVLM-0.5B-ONNX`) is about 840 MB to 1.1 GB, depending on dtype.
  - LFM2-VL 450M (`onnx-community/LFM2-VL-450M-ONNX`) is about 550 MB.
- **Tested here:** FastVLM 0.5B with `embed_tokens: 'fp16'`, `vision_encoder: 'fp16'`, `decoder_model_merged: 'q4f16'` (about 770 MB) ran on WebGPU at 1.3–2.1 s per caption on an M-series Mac. The `<image>` tag goes in the user message text.
- EdgeTAM, SAM2 and SAM3 tracker: `EdgeTamModel` segments a single image from point prompts.
  - There is no video memory or propagation API in JS, so live click-to-track means segmenting every frame again from a point. Use the previous mask's center as that point.
  - EdgeTAM is about 41 MB at fp32, and an encode plus decode takes about 220 ms on desktop WebGPU.
  - **Tested here:** at fp16, `onnx-community/EdgeTAM-ONNX` took about 180 ms per frame. `input_boxes: [[[x1, y1, x2, y2]]]` works alongside `input_points`, and adding the previous mask's box raised `iou_scores` from 0.46 to 0.83.
- Phones: WebGPU is on by default in iOS 26 Safari and in Chrome on Android 12+. `shader-f16` is missing on many older Android GPUs.

## Chrome Prompt API (multimodal)

- Shipped to the web in Chrome 148 (May 2026), desktop only: Windows 10/11, macOS 13+, Linux, Chromebook Plus. It needs 22 GB free, plus a GPU with more than 4 GB of VRAM or 16 GB RAM and 4 CPU cores.
- The global is `LanguageModel`. `availability()` returns `'unavailable'`, `'downloadable'`, `'downloading'` or `'available'`. Call `create()` from a click, because a download needs user activation.
- Images go in the message content: `{ type: 'image', value: videoElement }`. A video element, canvas, ImageBitmap, VideoFrame, Blob or ImageData all work.
- Cross-origin iframes need `allow="language-model"`. The p5.js Web Editor preview doesn't grant it, so these sketches have to run on their own page.

## MindAR 1.2.5

- Effectively unmaintained since January 2024.
- Its dist files import `sRGBEncoding`, which three.js removed in r162. The image-target example maps `three` to a two-line shim (`three-compat.js`) for MindAR's files only, using an import-map scope.
- It opens its own camera. The image build defaults to the rear camera. The sample target (`card.mind`, `card.png`) is on jsDelivr with CORS.
- There is one open report (#581) of iOS 27 failing to compile MindAR's TF.js shaders.
- **Tested here:** with the shim, MindAR started without errors on three r185.1. In Chromium 152 (macOS), its detector returned only 2 feature points for the sample card, so it never matched. MindAR's documented setup with three r160 gave the same result. Tracking is unconfirmed.

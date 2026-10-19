# YOLO segment

## What it does

Finds the same 80 COCO objects as [yolo-detect](../../detection/yolo-detect/), and also colors in the pixels each one covers. Tap to switch between the video with masks on top and the masks alone.

## Key data

- `results.boxes`: `[{ x1, y1, x2, y2, conf, name, color }]` in video pixels.
- `results.masks`: **one** RGBA image (`results.width × results.height × 4` bytes) with every object painted in its class color and the background transparent. The library merges the masks, so you can't separate two people from each other. It is an empty array when nothing is found.
- `maskImage`: those bytes copied into a p5.Image and drawn over the video with `drawOverCamera()`.
- `coverage`: 0 to 1, how much of the frame any object covers.

## Desktop

- WebGPU in Chrome and Edge: about 45 ms per frame on an M-series Mac.
- Copying the 640 × 480 mask into a p5.Image each frame costs a few milliseconds.

## Phone

- Starts on the rear camera.
- First load is about 17 MB (11 MB model plus runtime). Use Wi‑Fi.
- This is the heaviest of the YOLO examples, so expect a lower frame rate than detect.

## Library and docs links

- [@ultralytics/yolo for the web](https://github.com/ultralytics/inference/tree/main/web)
- [Ultralytics segment task docs](https://docs.ultralytics.com/tasks/segment/)
- Model: `models/yolo26n-seg.onnx` from the [v8.4.0 assets release](https://github.com/ultralytics/assets/releases/tag/v8.4.0).
- For one mask per object that you choose with a tap, see [mp-interactive-segmenter](../mp-interactive-segmenter/).
- License and telemetry notes: see [yolo-detect](../../detection/yolo-detect/README.md#library-and-docs-links).

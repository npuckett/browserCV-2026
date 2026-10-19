# YOLO pose

## What it does

Finds every person in view with YOLO26 nano pose, draws a 17-point skeleton for each, and flags anyone with both hands above their head. YOLO pose handles groups, where single-person pose models track one body.

## Key data

- `results.boxes`: one box per person, in video pixels.
- `results.keypoints`: one entry per box, in the same order: `{ points: [[x, y, conf], ... 17], color }`.
- `people`: `[{ points: [{ x, y, conf }], color, handsUp }]` in canvas pixels. A keypoint counts when its `conf` is above `KEYPOINT_CONFIDENCE` (0.4).
- `SKELETON`: the pairs of keypoint indices joined by bones.

COCO keypoint order: 0 nose, 1/2 eyes, 3/4 ears, 5/6 shoulders, 7/8 elbows, 9/10 wrists, 11/12 hips, 13/14 knees, 15/16 ankles. Odd numbers are the person's left side. This differs from ml5's 33-point BlazePose layout in [ml5-bodypose](../../foundations/ml5-bodypose/).

## Desktop

- WebGPU in Chrome and Edge: about 35 ms per frame on an M-series Mac.
- Step back so people are in full view.

## Phone

- Starts on the rear camera, so you can point it at a group.
- First load is about 18 MB: the 12 MB model plus the ONNX Runtime. Use Wi‑Fi.
- Without WebGPU it falls back to the CPU and slows down a lot.

## Library and docs links

- [@ultralytics/yolo for the web](https://github.com/ultralytics/inference/tree/main/web)
- [Ultralytics pose task docs](https://docs.ultralytics.com/tasks/pose/)
- Model: `models/yolo26n-pose.onnx` from the [v8.4.0 assets release](https://github.com/ultralytics/assets/releases/tag/v8.4.0).
- License and telemetry notes: see [yolo-detect](../yolo-detect/README.md#library-and-docs-links).

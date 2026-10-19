# Click to track

## What it does

Tap an object and the sketch cuts it out and keeps following it. It uses EdgeTAM, a small, fast version of Meta's SAM 2 segmentation model, through Transformers.js.

**How the "tracking" works, honestly:**

- SAM 2 and EdgeTAM can track through video with a memory of earlier frames, but Transformers.js 4.3 only exposes **single-image** segmentation for them. There is no video or memory API in JavaScript yet.
- So this sketch segments every frame again. Each frame is prompted with the previous mask's center and bounding box, shifted by the object's last movement.
- That follows slow, distinct objects well. It lags behind fast objects, and can jump to look-alike ones. Tap again to re-select.

## Key data

- `prompt`: `{ point: { x, y }, box: [x1, y1, x2, y2] | null }` in frame pixels. It is passed to the processor as nested arrays (image → object → point):
  ```js
  processor(image, {
    input_points: [[[[x, y]]]],
    input_labels: [[[1]]],            // 1 = on the object
    input_boxes: [[[x1, y1, x2, y2]]] // optional
  })
  ```
- The model returns `pred_masks` (`[1, 1, 3, 256, 256]`: three candidate masks) and `iou_scores` (its own quality estimate for each).
  - `processor.post_process_masks()` scales the masks up to the frame size as booleans.
  - The sketch keeps the best-scoring mask.
- `track`: `{ mask, center, box, score, area }`. The object counts as lost when the mask is empty or `score` falls below `LOST_SCORE` (0.3).

Measured: a box prompt from the previous mask raised the score from 0.46 (point only) to 0.83 on the same object.

## Desktop

- Chrome or Edge with WebGPU: about 180–210 ms per frame on an M-series Mac (fp16). That's 4–5 tracking updates a second, while the video draws at full speed.
- A simulated-camera test showed both sides: tracking held a slowly moving ball, lagged when the ball moved more than its own width between updates, and caught up once it slowed down.
- Without WebGPU it falls back to the CPU with 8-bit weights, which is much slower.

## Phone

- Experimental. EdgeTAM runs its image encoder on every frame, so expect about one update a second on a recent phone with WebGPU.
- Starts on the rear camera.
- Downloads about 20 MB at fp16 (40 MB at fp32, 13 MB at q8), plus the ONNX Runtime wasm.

## Library and docs links

- [Transformers.js](https://huggingface.co/docs/transformers.js) 4.3.1: `EdgeTamModel`, `AutoProcessor`.
- Model: [onnx-community/EdgeTAM-ONNX](https://huggingface.co/onnx-community/EdgeTAM-ONNX). [EdgeTAM paper and code](https://github.com/facebookresearch/EdgeTAM).
- For selecting an object in a still frame, with + / − refinement, see [mp-interactive-segmenter](../mp-interactive-segmenter/), which needs no WebGPU.

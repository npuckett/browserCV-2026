# MediaPipe interactive segmenter

## What it does

Tap any object and it is cut out from the rest of the frame. It isn't limited to a fixed list of classes: it segments whatever is under your finger.

The segmenter works on still images, so a tap freezes the frame. Then:

- **+**: taps add to the selection.
- **−**: taps remove from it.
- **Live**: return to the camera.

## Key data

- `strokes`: the points you've tapped, in MediaPipe's format: `{ brushMode: 1 (add) | 2 (remove), point: [{ x, y }], isCompleted: true }`. `x` and `y` run from 0 to 1 across the frozen frame.
- `maskValues`: a Float32Array with one 0 to 1 value per pixel, from `mask.getAsFloat32Array()`. Above 0.5 counts as selected.
- `selection`: `{ area, box }`. `area` is the selected share of the frame. `box` is the bounding box in canvas pixels.

How the API works (tasks-vision 1.0 and later):

```js
segmenter.setImage(frozenCanvas);          // slow: runs the encoder once per frame
const mask = segmenter.segment(strokes);   // fast: run again whenever strokes change
const values = mask.getAsFloat32Array();
mask.close();                              // free the mask's wasm memory
```

`BrushMode` is in the type definitions but isn't exported at runtime, so the sketch uses the numbers 1 and 2.

## Desktop

- Any browser with WebAssembly. The model runs on the CPU, which Google's benchmarks show is faster than the GPU delegate for this model.
- Freezing and analyzing a frame takes a fraction of a second on a laptop. Each extra tap takes a few milliseconds.
- Keyboard: `+` / `-` choose the brush, and `L` or Escape returns to live.

## Phone

- Starts on the rear camera.
- **The model is 30 MB**, the largest MediaPipe download here. Use Wi‑Fi.
- The first tap on a frame can take a second or more on a phone while it analyzes the image.
- Lighter option: the older `InteractiveSegmenterLegacy` uses a 6 MB model (`interactive_segmenter/magic_touch/float32/1/magic_touch.tflite`) with `segment(image, { keypoint: { x, y } }, callback)`. Google marks it deprecated.

## Library and docs links

- MediaPipe loading pattern after **Golan Levin**'s [mediapipe_2026!](https://editor.p5js.org/golan/sketches/0XkgzZGe8) (dynamic `import()` from a plain p5 sketch). His MediaPipe sketches are listed with credits in [p5 MediaPipe by Golan Levin](../../mediapipe-golan-levin/).
- [MediaPipe Interactive Segmenter for web](https://ai.google.dev/edge/mediapipe/solutions/vision/interactive_segmenter/web_js)
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision), pinned to 1.1.0.
- For every object of known classes at once, see [yolo-segment](../yolo-segment/). For following a tapped object through live video, see [click-to-track](../click-to-track/).

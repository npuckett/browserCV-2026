# ml5 depth estimation

## What it does

Estimates how far each pixel is from the camera and draws the result as a colored depth map: yellow is near, purple is far. It marks the closest point on the person and reads the depth under the pointer.

ml5's `depthEstimation` uses TensorFlow's ARPortraitDepth model, which was **trained on portraits**: one person facing the camera and filling much of the frame. For rooms and objects, use the general-purpose model in [`p5/depth/depth-map`](../../depth/depth-map/).

## Key data

- `depthResult.image`: the depth map as a p5.Image.
- `depthResult.getDepthAt(x, y)`: depth at a pixel of the depth map, from 0 (near) to 1 (far). With `applySegmentationMask: true`, ml5 cuts the person out with a second model and sets the background to exactly 0, so the sketch reads 0 as "background".
- `depthResult.data`: the whole map as a 2D array, `data[y][x]`.
- `closest`: `{ x, y, depth }`, the smallest non-zero depth, in canvas pixels.
- Options used: `normalizeDynamically: true` (stretch each frame's range over all the colors), `colormap: 'color'`, `targetFps: 15`.

## Desktop

- Any current browser with a webcam, on `https` or `localhost`.
- Sit facing the webcam.
- Runs on TensorFlow.js with WebGL. Expect 10–15 depth frames a second on a laptop.

## Phone

- Uses the front camera: hold the phone at arm's length.
- A quick tap toggles the depth map. Holding a finger down reads the depth under it.
- About 11 MB of models (depth and segmentation) on first load, so use Wi‑Fi.
- Expect a few frames a second, and a warm phone.

## Library and docs links

- [ml5 depthEstimation reference](https://docs.ml5js.org/#/reference/depthestimation)
- [ARPortraitDepth on TensorFlow Hub](https://www.kaggle.com/models/tensorflow/ar-portrait-depth) and the [blog post that introduced it](https://blog.tensorflow.org/2022/05/portrait-depth-api-turning-single-image.html)

# Depth map

## What it does

Estimates depth for any scene (rooms, objects, streets, people) with Depth Anything V2 small, running in the browser through Transformers.js. Tap to switch between two views:

- **map**: the depth map over the camera image. Bright is near, dark is far.
- **3d**: a p5 WEBGL mesh with each vertex pushed toward you by its depth and textured with the same frame. Move the mouse or a finger to tilt it.

## Key data

- `estimator(canvas)` returns `{ depth, predicted_depth }`.
  - `depth` is a RawImage `{ width, height, channels: 1, data }`. `data` holds one byte per pixel, scaled so that 0 is the farthest point in this frame and 255 the nearest.
  - `predicted_depth` holds the raw float values.
- Depth Anything gives **relative** depth: nearer or farther within one frame, not meters. The same object can read differently from one frame to the next as the scene changes.
- `depthAt(x, y)`: nearness from 0 to 1 at a point of the depth image.
- `device` / `dtype`: what the model runs on.

| Situation | Device | dtype | Model download |
| --- | --- | --- | --- |
| WebGPU with `shader-f16` (most desktops, iPhones, newer Android) | `webgpu` | `fp16` | 47 MB |
| WebGPU without `shader-f16` | `webgpu` | `fp32` | 94 MB |
| No WebGPU | `wasm` | `q8` | 26 MB |

The sketch checks `adapter.features.has('shader-f16')`, because asking for `fp16` on a GPU without it throws an error.

The 3D view draws on a separate `createGraphics(w, h, WEBGL)` layer. That keeps the main canvas 2D, so the camera helpers keep working. The layer is drawn with `image()`.

## Desktop

- Best in Chrome or Edge with WebGPU. Measured on an M-series Mac: about 100 ms per 384 × 288 frame, so depth updates about 10 times a second while the video stays smooth.
- Transformers.js also downloads its ONNX Runtime wasm (27 MB uncompressed) from jsDelivr. Everything is cached after the first visit.

## Phone

- Treat it as best effort. It is heavy: expect one or two depth frames a second on a recent phone with WebGPU, and much slower on the CPU fallback.
- Starts on the rear camera. The model input is smaller on phones (`INPUT_SIZE` 256), and the mesh is coarser.
- The first load is 50–100 MB. Use Wi‑Fi.
- Needs iOS 26 Safari or Chrome on Android 12+ for WebGPU. Transformers.js 4.3.0 or later is needed for WebGPU in Safari.

## Library and docs links

- [Transformers.js](https://huggingface.co/docs/transformers.js), pinned to 4.3.1.
- Model: [onnx-community/depth-anything-v2-small](https://huggingface.co/onnx-community/depth-anything-v2-small). [Depth Anything V2 project page](https://depth-anything-v2.github.io/).
- Reference demo: [Xenova's real-time WebGPU depth estimation Space](https://huggingface.co/spaces/Xenova/webgpu-realtime-depth-estimation).
- Portrait-only depth with a smaller download: [ml5-depth](../../foundations/ml5-depth/). Depth as a point cloud: [three/depth-pointcloud](../../../three/depth-pointcloud/).

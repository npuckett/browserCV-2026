# Depth point cloud

## What it does

Turns the camera image into a 3D point cloud. Depth Anything V2 (small, via Transformers.js) estimates depth for every pixel. Each pixel becomes a point, placed by its image position, pushed forward by its depth, and colored from the camera. Drag to orbit, and pinch or scroll to zoom (three.js OrbitControls).

## Key data

- `depthImage` (from the `depth-estimation` pipeline): a RawImage `{ width, height, data }` with one byte per pixel, where 255 is the nearest point in this frame.
- The cloud is a single `THREE.Points`. Its `BufferGeometry` has two attributes, one value set per pixel:
  - `position`: x and y from the pixel, z = nearness × `DEPTH_SCALE`.
  - `color`: from the same frame, downscaled to `INPUT_SIZE`.
  - Both are rewritten in place for every depth result (`needsUpdate = true`), so nothing is reallocated.
- Depth Anything gives **relative** depth: it orders what's near and far within one frame, not meters. `DEPTH_SCALE` sets how deep the cloud looks.

Tested with a street photo: 76,800 points (320 × 240), drawn in one call.

## Desktop

- Chrome or Edge with WebGPU: about 100 ms per depth update on an M-series Mac, while orbiting stays at full frame rate.
- Mirrored webcam. The cloud is mirrored to match.
- Model download: 47 MB (fp16) or 94 MB (fp32). Without WebGPU, a 26 MB 8-bit model runs on the CPU, slowly.

## Phone

- Best effort: rear camera, 224 points across, and depth updates every second or two on a recent phone with WebGPU.
- One-finger drag orbits, two fingers zoom.
- 50–100 MB first download. Use Wi‑Fi.

## Library and docs links

- [Transformers.js](https://huggingface.co/docs/transformers.js) 4.3.1 and [Depth Anything V2 small](https://huggingface.co/onnx-community/depth-anything-v2-small).
- [three.js Points](https://threejs.org/docs/#api/en/objects/Points) and [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls).
- The same model as a p5 depth map and WEBGL mesh: [p5/depth/depth-map](../../p5/depth/depth-map/).

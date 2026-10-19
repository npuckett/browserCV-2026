# Vendored: apriltag-js-standalone

The official [AprilTag 3](https://github.com/AprilRobotics/apriltag) C library compiled to WebAssembly, with a small JavaScript wrapper that runs in a Web Worker.

- Source: [arenaxr/apriltag-js-standalone](https://github.com/arenaxr/apriltag-js-standalone) (formerly conix-center), folder `html/`, commit `f0fe55676265a1251ad36f18bac9939206a59e19`.
- License: BSD-3-Clause (see `LICENSE`).
- Tag family: **tag36h11 only**, ids 0–586.

## Why vendored

It isn't published to npm. Also, a Web Worker script must come from the same origin as the page, and the worker loads `apriltag_wasm.wasm` by relative path, so the three files must sit together on your own site.

## Files

| File | SHA-256 (as downloaded) |
| --- | --- |
| `apriltag.js` | `344db2e8e2f7ec1cef68635586594a97d584f22f303fc67dc5cc8c9fc982ab7b` (before the edit below) |
| `apriltag_wasm.js` | `587c3b98f7e9a312d9f69dbb541c91741f9ee2df10c356362b05243041e3ddea` |
| `apriltag_wasm.wasm` | `0283215c40f3bcd265d2650aeb0d4419e87222830fe8a31a1978401a4cac77aa` |

**One change** to `apriltag.js`: upstream loads Comlink from an unpinned `unpkg.com/comlink` URL, which this copy pins to `cdn.jsdelivr.net/npm/comlink@4.4.2`.

## Using it

On the page, load Comlink (`https://cdn.jsdelivr.net/npm/comlink@4.4.2/dist/umd/comlink.min.js`), then:

```js
const Apriltag = Comlink.wrap(new Worker('path/to/vendor/apriltag/apriltag.js'));
const detector = await new Apriltag(Comlink.proxy(() => { /* wasm ready */ }));
await detector.set_camera_info(fx, fy, cx, cy);  // focal length and center, in pixels
await detector.set_tag_size(0, 0.05);            // tag id 0 is 5 cm wide (black square)
const detections = await detector.detect(grayBytes, width, height); // Uint8Array, one byte per pixel
```

Each detection is `{ id, corners: [{ x, y } × 4], center: { x, y }, pose: { size, R, t, e, asol } }`.

- `R` is a 3×3 rotation. The wasm writes it column by column, so `R[c][r]`.
- `t` is the translation in meters, in camera axes: x right, y down, z forward.
- `pose` is included by default (`set_return_pose(0)` turns it off), but it is only accurate after `set_camera_info()` and `set_tag_size()`. The defaults are a 0.15 m tag and a 1280 × 720 camera.

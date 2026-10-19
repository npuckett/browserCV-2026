# AprilTag detect

## What it does

Finds AprilTags (family tag36h11) with the official AprilTag C library compiled to WebAssembly. It outlines each tag, labels its id, and estimates how far away it is. AprilTags are harder to fool than ArUco markers and cope better with blur and dim light. They are widely used in robotics. Print tags from [`markers/print-apriltag.html`](../../../markers/print-apriltag.html).

## Key data

- The detector's output, per tag:
  - `id`: 0–586.
  - `corners`: 4 × `{ x, y }`, counter-clockwise starting at the tag's own bottom-left (the red dot).
  - `center`: `{ x, y }`.
  - `pose`:
    - `t`: `[x, y, z]` in meters from the camera: x right, y down, z straight ahead.
    - `R`: a 3×3 rotation stored column by column.
    - `size`: the tag size used.
- `tags`: `[{ id, corners, center, distance }]` with canvas pixels and the distance in meters.
- `TAG_SIZE_METERS`: the width of the printed tag's **black square**. Measure your print, because a wrong value scales every distance.
- `CAMERA_FOV_DEGREES`: the camera's horizontal field of view.
  - Pose needs the focal length in pixels. Without a camera calibration, the sketch estimates it as `(frameWidth / 2) / tan(fov / 2)`, so distances are approximate.
  - Look up your camera's field of view, or tune it: hold a tag at a measured distance and adjust until the reading matches.

How it's wired:

- The detector runs in a Web Worker (`vendor/apriltag/apriltag.js`), so it doesn't slow down `draw()`.
- [Comlink](https://github.com/GoogleChromeLabs/comlink) makes the worker's methods callable as async functions: `await detector.detect(grayBytes, width, height)`.
- The sketch converts each scanned frame to one brightness byte per pixel before sending it.

## Desktop

- Any current browser. The wasm build is small (about 120 KB) and runs on the CPU.
- Hold printed tags up to the webcam.

## Phone

- Starts on the rear camera.
- Must be served from your own site (GitHub Pages works). A Web Worker script can't come from another domain, which is why the library is vendored in `vendor/apriltag/`.
- In the p5.js Web Editor, upload `apriltag.js`, `apriltag_wasm.js` and `apriltag_wasm.wasm` next to `sketch.js` and point the `Worker` at `'apriltag.js'`.

## Library and docs links

- [apriltag-js-standalone](https://github.com/arenaxr/apriltag-js-standalone) (BSD-3-Clause), vendored with notes in [`vendor/apriltag/`](../../../vendor/apriltag/).
- [AprilTag](https://april.eecs.umich.edu/software/apriltag) and the [official tag images](https://github.com/AprilRobotics/apriltag-imgs).
- 3D objects on tags: [three/apriltag-pose](../../../three/apriltag-pose/).
- For a pure-JavaScript option that also reads AprilTags, load js-aruco2's `apriltag_36h11.js` dictionary (see [aruco-markers](../aruco-markers/)).

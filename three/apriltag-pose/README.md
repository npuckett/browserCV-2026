# AprilTag pose

## What it does

Stands a three.js pillar and label on every AprilTag (tag36h11) the camera sees. The official AprilTag library, compiled to WebAssembly and running in a Web Worker, finds the tags and estimates each one's 3D pose. The camera feed is the scene background, via three-phone.

Print tags from [`markers/print-apriltag.html`](../../markers/print-apriltag.html), measure one, and set `TAG_SIZE` (meters).

## Key data

- `detector.set_camera_info(fx, fy, cx, cy)`: the camera's focal length and center, in pixels of the frame sent to the detector. Without a calibration, the focal length comes from `CAMERA_FOV_DEGREES` through `matchCameraToVideo()`.
- `detector.set_tag_size(id, meters)`: needed for real distances.
- Each detection's `pose`:
  - `R` is a 3×3 rotation stored column by column (`R[col][row]`).
  - `t` is `[x, y, z]` in meters in OpenCV camera axes: x right, y down, z straight ahead.
- `setAnchorPose()` converts to three.js axes (y up, z toward the viewer) by flipping y and z on both sides of the transform.
- `anchors[id]`: a `THREE.Group` in tag space. The tag lies in the x/y plane at the origin, and +z points out of the paper.

Tested with a simulated camera:

- Tag centers projected to the exact screen positions.
- Distances matched `focal × size / pixels`.
- A tag turned 0.4 rad read −0.402 rad about z, which is clockwise on screen in three.js's y-up axes.

## Desktop

- Any browser with WebGL and WebAssembly.
- Not mirrored, so the 3D matches the real image.

## Phone

- Rear camera. AprilTags hold up better than ArUco markers to blur, low light and steep angles, which suits a phone moving over a table.
- Must be served from your own site, because a Web Worker can't load from another domain. GitHub Pages works.
- About 200 KB for the detector, plus three.js.

## Library and docs links

- [apriltag-js-standalone](https://github.com/arenaxr/apriltag-js-standalone), vendored in [`vendor/apriltag/`](../../vendor/apriltag/) with notes.
- [AprilTag](https://april.eecs.umich.edu/software/apriltag) · [Comlink](https://github.com/GoogleChromeLabs/comlink) · [three-phone](https://github.com/npuckett/three-phone)
- 2D detection with distance: [p5/markers/apriltag-detect](../../p5/markers/apriltag-detect/).

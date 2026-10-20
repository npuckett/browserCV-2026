# ArUco pose

## What it does

Places a three.js cube on every ArUco marker the camera sees, sitting on the paper and turning with it. js-aruco2 finds the markers, and its POSIT solver works out each one's 3D position and rotation. The camera feed is the scene background, via three-phone.

Print markers from [`markers/print-aruco.html`](../../markers/print-aruco.html) (`ARUCO_MIP_36h12`), measure one, and set `MARKER_SIZE`.

If the camera does not start, the page says how to turn it on and shows one cube on its own. three-phone calls `userSetupComplete()` after the tap, even when the person taps "Don't Allow". `window.cameraEnabled` is false then.

## Key data

- `posit.pose(corners)` returns `{ bestRotation, bestTranslation, bestError, alternativeRotation, ... }`.
  - The corners go in measured from the image center, with y pointing up.
  - `bestTranslation` is in the same units as the marker size (meters here): x right, y up, z away from the camera.
- `setAnchorPose()` turns that into a three.js matrix. POSIT's camera looks along +z and three.js looks along −z, so the z row and column of the rotation flip sign.
- `anchors[id]`: a `THREE.Group` in marker space. The marker lies in the x/y plane at the origin, and +z points out of the paper. Anything you add to the group (a model, particles, a label) sits on the marker.
- `matchCameraToVideo(camera, cam, renderer, fov)` (from `shared/three-helpers.js`) sets the three.js camera's field of view to match the cover-fitted camera feed and returns the focal length in video pixels.
  - POSIT needs that focal length.
  - `CAMERA_FOV_DEGREES` (60) is a guess, because few cameras publish theirs. If objects seem to float above or sink into the marker, adjust it.

Tested with a simulated camera: cube centers projected to within 1 px of the marker centers on screen, distances matched `focal × size / pixels`, and a 0.4 rad turn read as 0.404 rad.

## Desktop

- Any browser with WebGL. js-aruco2 is plain JavaScript.
- The webcam is **not mirrored** here, unlike the 2D examples, because the 3D objects have to match the real image.
- Hold markers up to the webcam, square to the camera at first.

## Phone

- Rear camera: lay markers on a table and look down at them. Each cube stands on its marker.
- POSIT can briefly flip between two solutions when a marker faces the camera straight on. Viewing at a slight angle steadies it.
- Downloads are small: three.js (about 700 KB), three-phone and js-aruco2.

## Library and docs links

- [js-aruco2](https://github.com/damianofalcioni/js-aruco2): `AR.Detector` and `POS.Posit` (`posit1.js`), plus the library's own [three.js POSIT demo](https://damianofalcioni.github.io/js-aruco2/samples/debug-posit/debug-posit.html).
- [three-phone](https://github.com/npuckett/three-phone): `createPhoneCamera`, `attachBackground`, `enableCameraTap`.
- 2D marker controls: [p5/markers/aruco-markers](../../p5/markers/aruco-markers/). The same idea with AprilTags: [apriltag-pose](../apriltag-pose/).

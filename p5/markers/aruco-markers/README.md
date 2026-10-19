# ArUco markers

## What it does

Detects printed ArUco markers with js-aruco2. It outlines each marker, labels its id, and works out its center, size and rotation. Each id controls something different, so the markers work as physical knobs and switches:

- **Marker 0**: turn it to change the hue.
- **Marker 1**: turn it to change the size.
- **Marker 2**: show it to switch from a circle to a square.

Print markers from [`markers/print-aruco.html`](../../../markers/print-aruco.html) (dictionary `ARUCO_MIP_36h12`, ids 0–2).

## Key data

- `markers`: js-aruco2's output, `[{ id, corners: [{ x, y } × 4], hammingDistance }]`, in pixels of the scanned frame. Corners run clockwise starting at the marker's own top-left.
- `tracked`: `{ [id]: { id, corners, center, angle, size } }`, converted to canvas pixels with `mapFramePoint()`.
  - `angle` runs from 0 to 360°: 0 is upright, and it grows as the marker turns clockwise on screen. The mirrored desktop view flips the marker's top edge, so the sketch measures that edge in the other direction when `cam.mirror` is true.
  - `size` is the average edge length in pixels, which shrinks as the marker moves away.
- Detector options: `new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 })`.
  - `maxHammingDistance` is how many bits of a code may be misread and still match. The dictionary's default of 12 lets random patterns count as markers.
- The detector reads a 640-pixel copy of the frame (`SCAN_SIZE`). Lower it for speed, raise it to find smaller markers.

Other dictionaries: `ARUCO` is also built in. AprilTag, ARTag, ARToolKitPlus and ChiliTags need their dictionary file loaded after `aruco.js`, for example `src/dictionaries/apriltag_36h11.js`, with `dictionaryName: 'APRILTAG_36h11'`.

## Desktop

- Any current browser. js-aruco2 is plain JavaScript, so no WebGPU or wasm is needed.
- Hold printed markers up to the webcam, or show them on a phone screen.
- Each marker needs its white border to be detected, so keep your fingers off it.

## Phone

- Starts on the rear camera. Lay markers on a table and look down at them, or hold them up.
- Nothing to download beyond p5, p5-phone and js-aruco2 (about 40 KB).
- Range depends on marker size and on `SCAN_SIZE`: bigger markers, or a bigger scan, work from farther away.
- Glare on glossy paper hides markers. Print on matte paper.

## Library and docs links

- [js-aruco2](https://github.com/damianofalcioni/js-aruco2) (MIT), pinned to 2.0.0 on npm. [Live demos](https://damianofalcioni.github.io/js-aruco2/), and the [marker creator](https://damianofalcioni.github.io/js-aruco2/samples/marker-creator/marker-creator.html) covers every dictionary.
- 3D pose from a marker: see [three/aruco-pose](../../../three/aruco-pose/).
- A sturdier detector for one family: [apriltag-detect](../apriltag-detect/).

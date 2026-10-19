# ml5 HandPose

## What it does

Finds up to two hands and draws their 21 landmarks. It measures the distance and angle between the thumb tip and index fingertip, and shows when they pinch.

## Key data

- `hands`: ml5's results. Each hand has `keypoints` (21 × `{ x, y, name }` in video pixels), `keypoints3D`, `handedness` (`'Left'` or `'Right'`) and `confidence`.
- `pointIndexA`, `pointIndexB`: which two keypoints to measure. The defaults are 4 (thumb tip) and 8 (index tip).
- `pointA`, `pointB`: those keypoints mapped to canvas pixels with `cam.mapKeypoint()`.
- `pinchDistance` (pixels) and `pinchAngle` (degrees, 0 = pointing right).

Keypoint indices: 0 wrist, thumb 1–4, index 5–8, middle 9–12, ring 13–16, pinky 17–20. The last number of each finger is its tip.

## Desktop

- Chrome, Edge, Firefox or Safari with a webcam, on `https` or `localhost`.
- The webcam is mirrored. ml5 runs with `flipped: false`, and `cam.mapKeypoint()` applies the mirror, so points line up with the drawn video.
- Expect 30 fps or more on a recent laptop.

## Phone

- Uses the front camera. The camera button switches to the rear one, for tracking someone else's hands.
- Tap the start screen to grant camera access. After that, tapping toggles the video.
- `runtime: 'mediapipe'` downloads about 15 MB of model and wasm files from jsDelivr on first load (less over the wire, because the wasm compresses). Use Wi‑Fi. The browser caches them for later visits.
- Expect 15–30 fps on a recent phone.

## Library and docs links

- Adapted from p5-phone's [PHONE_HandPose_two_points](https://github.com/npuckett/p5-phone/tree/main/examples/ml5/PHONE_HandPose_two_points), which also tracks velocity and more points.
- [ml5 handPose reference](https://docs.ml5js.org/#/reference/handpose)
- [p5-phone: working with cameras and ml5](https://github.com/npuckett/p5-phone/blob/main/siteDev/workingWithCameras.md)

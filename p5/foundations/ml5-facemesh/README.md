# ml5 FaceMesh

## What it does

Finds a face and its 468 landmarks. It measures how open the mouth is and how far the head tilts.

## Key data

- `faces`: ml5's results. Each face has `keypoints` (468 × `{ x, y, z }` in video pixels), `box`, and named regions such as `lips` and `leftEye`.
- `mouthOpen`: the gap between upper lip (13) and lower lip (14), divided by face width (234 to 454). Dividing by face width keeps the value the same near and far from the camera. It runs from about 0 (closed) to 0.5 (wide open).
- `headTilt`: the angle of the cheek-to-cheek line, in degrees. A level head reads 0.

Useful indices: 4 nose tip, 13 upper lip, 14 lower lip, 152 chin, 234 and 454 the sides of the face.

## Desktop

- Any current browser with a webcam, on `https` or `localhost`.
- Mirrored webcam. `cam.mapKeypoints()` places landmarks on the mirrored image.
- Expect 30 fps on a recent laptop.

## Phone

- Uses the front camera.
- Tap the start screen to grant camera access. After that, tapping toggles the video.
- About 10 MB of model and wasm files on first load. Use Wi‑Fi.
- Hold the phone at arm's length so the whole face is in view.

## Library and docs links

- Adapted from p5-phone's [PHONE_FaceMesh_two_points](https://github.com/npuckett/p5-phone/tree/main/examples/ml5/PHONE_FaceMesh_two_points).
- p5-phone's [Gaze detector class](https://github.com/npuckett/p5-phone/tree/main/examples/ml5/Gaze_detector_class) turns FaceMesh landmarks into gaze direction.
- [ml5 faceMesh reference](https://docs.ml5js.org/#/reference/facemesh) and [keypoint map](https://github.com/tensorflow/tfjs-models/blob/master/face-landmarks-detection/mesh_map.jpg)

# YOLO in space

## What it does

YOLO finds objects in the camera image, and each detection drops a labeled pin into a three.js scene, along the line from the camera through the object. On a phone, three-phone's magic-window AR turns the 3D camera with the device, so the pins stay where you found things. Scan a room, then turn around: the cup is still pinned where it was.

## Key data

- `results.boxes` (from `yolo.predict()`): `[{ x1, y1, x2, y2, conf, name, color }]` in video pixels.
- From box to direction:
  1. `cam.mapPoint()` gives the box center on screen.
  2. That point is converted to normalized device coordinates.
  3. `Vector3.unproject(camera)` turns it into a direction in the 3D world.
  - The sketch uses a copy of the camera **as it was when the frame was captured**. That keeps pins in the right place if the phone turns while YOLO works.
- `pins`: `[{ label, direction, group, lastSeen }]`.
  - A detection within `SAME_PIN_DEGREES` (6°) of a pin with the same label updates that pin instead of adding another.
  - Pins not seen for `FORGET_SECONDS` (30) fade out. There are at most `MAX_PINS` (30).
- YOLO gives no distance, so every pin sits `PIN_DISTANCE` (2 m) away, like labels on the inside of a sphere around you.
- `matchCameraToVideo()` sets the 3D camera's field of view to match the camera feed (`CAMERA_FOV_DEGREES`, 60), so pins line up with the image.

Tested with a simulated camera: pins projected onto the detected boxes' centers exactly.

## Desktop

- No motion sensors, so the camera doesn't turn. Pins appear over the detected objects and fade when they leave.
- Uses WebGPU in Chrome and Edge for YOLO (about 40 ms per frame), with a CPU fallback.

## Phone

- **This is where it shows:** tap once to allow the camera and motion (iOS asks twice), then look around slowly.
- Pins drift when the field-of-view guess doesn't match your phone camera. Adjust `CAMERA_FOV_DEGREES` until pins stay on objects as you turn.
- Magic-window AR follows rotation only. Walking around moves the real objects but not the pins.
- About 16 MB to download the first time (model plus ONNX Runtime).

## Library and docs links

- [@ultralytics/yolo for the web](https://github.com/ultralytics/inference/tree/main/web). License and telemetry notes are in [p5/detection/yolo-detect](../../p5/detection/yolo-detect/README.md#library-and-docs-links).
- [three-phone magic-window AR](https://github.com/npuckett/three-phone): `enableARTap`, `applyDeviceRotation`, `attachBackground`. See also its [tap-to-place example](https://github.com/npuckett/three-phone/tree/main/examples/AR%20Examples/magicWindow/02_tap_to_place).

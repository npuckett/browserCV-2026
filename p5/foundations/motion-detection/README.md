# Motion detection

## What it does

Compares each camera frame with the previous one. Pixels whose brightness changed by more than a threshold count as motion. The sketch highlights them, marks their center, and shows how much of the frame is moving.

## Key data

- `motionAmount`: 0 to 1, the share of pixels that changed between the last two frames.
- `motionCenter`: `{ x, y }` in canvas pixels, or `null` when almost nothing moved.
- `threshold`: how much a pixel's brightness (0 to 255) must change to count. Drag up or down, or use the arrow keys.

The sketch only compares when the camera has sent a new frame, using `isNewFrame()` from `shared/frame.js`. Cameras usually deliver 30 frames a second while `draw()` runs at 60. Without that check, every other comparison would be a frame against itself and report zero motion.

## Desktop

- Any current browser with a webcam, on `https` or `localhost`.
- Laptop webcams stay still, which makes this easy: wave at the camera.

## Phone

- Starts with the rear camera.
- Prop the phone up. If you hold it, the whole image moves and every pixel counts as motion.
- No download beyond p5 and p5-phone.

## Library and docs links

- After **Golan Levin**'s *Frame Differencing* example for Processing's video library ([source](https://github.com/processing/processing-video/blob/main/examples/Capture/FrameDifferencing/FrameDifferencing.pde)), which measures movement by comparing frames.
- [p5-phone PhoneCamera](https://github.com/npuckett/p5-phone#phonecamera-ml5-integration)
- [HTMLVideoElement.requestVideoFrameCallback()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback), which `isNewFrame()` uses to count camera frames

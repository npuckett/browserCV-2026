# Color tracking

## What it does

Tap or click the camera image to pick a color. The sketch marks every pixel close to that color and tracks the center and bounding box of the matches.

## Key data

- `targetColor`: `{ r, g, b }`, averaged from a small square around the tap.
- `tolerance`: how far a pixel's color can be from the target (RGB distance) and still match. Change it with the − and + buttons or the arrow keys.
- `matchCount`: how many pixels matched this frame.
- `tracked`: `{ x, y, box: { x, y, w, h } }` in canvas pixels, or `null` when fewer than 30 pixels match.

The sketch scans a 240-pixel copy of the frame from `grabFrame()` (in `shared/frame.js`). It converts results to canvas coordinates with `mapFramePoint()`, which accounts for the fit mode and the mirror.

## Desktop

- Any current browser with a webcam, on `https` or `localhost`.
- The webcam faces you and is mirrored, like a mirror.
- Runs at full frame rate. Raise `SCAN_SIZE` for a sharper mask.

## Phone

- Starts with the rear camera. The camera button switches to the front one.
- One tap on the start screen grants camera access. On iOS this tap is required.
- Tap a colored object to track it. Bright, saturated colors (a green ball, a red cup) work best, and changing light shifts every color.
- No download beyond p5 and p5-phone (about 1 MB).

## Library and docs links

- Ported from p5-phone's [camera color tracking example](https://github.com/npuckett/p5-phone/tree/main/examples/Phone%20Sensor%20Examples/camera/01_color_tracking), which compares the average color in one fixed square.
- [p5-phone PhoneCamera](https://github.com/npuckett/p5-phone#phonecamera-ml5-integration)
- [p5.js pixels reference](https://beta.p5js.org/reference/p5/pixels/)

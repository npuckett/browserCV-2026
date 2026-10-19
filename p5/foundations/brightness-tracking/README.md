# Brightness tracking

## What it does

Follows the brightest spot in the camera image, such as a flashlight, a lamp or a lit screen. It shows two methods together: the single brightest pixel, and the center of every pixel above a threshold.

## Key data

- `brightest`: `{ x, y, value }`, the single brightest pixel in canvas pixels. `value` runs from 0 to 255. Simple, but it jumps between equally bright pixels.
- `centroid`: `{ x, y, area }`, the average position of all pixels at or above `threshold`. `area` is the share of the frame they cover (0 to 1). It is steadier, and `area` tells you how big the spot is.
- `threshold`: 50 to 255. Drag up or down anywhere, or use the arrow keys.

Brightness is computed as `0.299 R + 0.587 G + 0.114 B`, which matches how bright colors look to people.

## Desktop

- Any current browser with a webcam, on `https` or `localhost`.
- Works best in a dim room: hold a phone flashlight up to the webcam.
- Webcams adjust their exposure automatically, so a bright light can darken the rest of the image.

## Phone

- Starts with the rear camera.
- Point it at lights in a dark room, or have someone wave a flashlight.
- Drag up or down to change the threshold.
- No download beyond p5 and p5-phone.

## Library and docs links

- After **Golan Levin**'s *Brightness Tracking* example for Processing's video library ([source](https://github.com/processing/processing-video/blob/main/examples/Capture/BrightnessTracking/BrightnessTracking.pde)), which tracks the brightest pixel in live video.
- [p5-phone PhoneCamera](https://github.com/npuckett/p5-phone#phonecamera-ml5-integration)

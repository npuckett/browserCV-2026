# Image target

## What it does

Recognizes a specific printed image (here MindAR's sample card) and anchors three.js content to it: a glowing outline on the card and a shape floating above it. Image targets suit posters, book covers, packaging and exhibition labels.

> **Status: unconfirmed.** MindAR loads and starts with three.js r185 (see the shim below), and the page reports no errors. But in this repo's test browser (Chromium 152 on macOS, with a simulated camera), MindAR's detector found only 2 feature points on the card and never locked on. MindAR's own documented setup with three r160 gave the same result, so the shim isn't the cause. Test on your own devices before relying on it.
>
> MindAR hasn't been updated since January 2024, and there is an open report ([#581](https://github.com/hiukim/mind-ar-js/issues/581)) of its bundled TensorFlow.js shaders failing on iOS 27.

## Key data

- `new MindARThree({ container, imageTargetSrc })` creates the renderer, scene and camera, and opens the camera itself. It uses the rear camera by default.
- `mindarThree.addAnchor(0)`: an anchor for target 0 in the `.mind` file.
  - `anchor.group` is a `THREE.Group` that follows the image. In its space the image is 1 unit wide, centered on the origin, with +z pointing out of it.
- `anchor.onTargetFound` / `anchor.onTargetLost`: called when tracking starts and stops.
- `TARGET_ASPECT`: the image's height ÷ width (0.552 for the card), so content can match its outline.

### Making your own target

Upload your image to MindAR's [image target compiler](https://hiukim.github.io/mind-ar-js-doc/tools/compile). Download the `.mind` file, put it next to `sketch.js`, and set `TARGET_URL` to it. Images with lots of detail and contrast track best. Plain logos and large flat areas track poorly.

### The three.js r185 shim

MindAR's build imports `sRGBEncoding`, which three.js removed in r162, so it fails to load with current three.js. The import map has a **scope** that sends MindAR's own `import 'three'` to [`three-compat.js`](three-compat.js), which re-exports three.js plus that one constant. Every other file gets the real three.js r185.1, the same version three-phone pins.

## Desktop

- Hold the printed card, or the card on a phone screen, up to the webcam. MindAR doesn't mirror the view.
- Tap **Start camera** first. MindAR downloads its target file and TensorFlow.js models on start.

## Phone

- Rear camera. Point it at the printed card.
- iOS: see the status note above.

## Library and docs links

- [MindAR docs](https://hiukim.github.io/mind-ar-js-doc/), its [three.js image tracking guide](https://hiukim.github.io/mind-ar-js-doc/quick-start/overview) and the [repository](https://github.com/hiukim/mind-ar-js) (MIT).
- Sample target: [card.png](https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.png) and its `card.mind`.
- For printed markers that are confirmed working here, see [aruco-pose](../aruco-pose/) and [apriltag-pose](../apriltag-pose/).

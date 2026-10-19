# QR markers

## What it does

Uses QR codes as cheap printable markers. A code's corners say where it is, and its text says what it means. This sketch fills each code with the color its text names (`red`, `blue`, `#ff8800`) and labels it. Print codes with any text from [`markers/print-qr.html`](../../../markers/print-qr.html).

## Key data

- `codes`: `[{ text, corners: [{ x, y } × 4], center }]` in canvas pixels. Corners run clockwise from the code's own top-left (the red dot).
- `method`: `'native'` (the browser's `BarcodeDetector`) or `'zxing-wasm'` (the ponyfill).
- `detector.detect(cam.videoElement)` returns `[{ rawValue, cornerPoints, boundingBox, format }]` in video pixels. Both detectors share this API, so the sketch has a single code path.

The sketch feature-detects in two steps. First it checks whether `BarcodeDetector` exists, then whether `getSupportedFormats()` includes `qr_code`, because the class can exist on platforms where it finds no QR codes.

### Why not jsQR?

The brief suggested jsQR as the fallback. In testing, jsQR 1.4.0 decoded one code fine, but returned **nothing** whenever two *different* codes were in view, because it mixes up their finder patterns. Multiple codes in view is the whole point of using them as markers, and the fallback is what every iPhone uses. So this example uses the [barcode-detector](https://github.com/Sec-ant/barcode-detector) ponyfill instead. It is maintained, finds several codes at once, and matches the native API. jsQR is still a fine choice when you only ever need one code at a time.

## Desktop

- Chrome and Edge on macOS and ChromeOS have a native `BarcodeDetector`.
- Chrome on Windows and Linux, Firefox and Safari use the ponyfill.
- Show printed codes or codes on a phone screen to the webcam. Mirroring doesn't affect detection.

## Phone

- Starts on the rear camera.
- Chrome on Android uses the native detector. Safari on iPhone has it only behind a flag, so it uses the ponyfill.
- The ponyfill downloads a 1 MB wasm file from jsDelivr the first time it detects (cached afterwards). After that it takes a few milliseconds per frame.
- Short text makes a simpler code, which reads from farther away.

## Library and docs links

- [Barcode Detection API on MDN](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API)
- [barcode-detector](https://www.npmjs.com/package/barcode-detector) 3.2.2 (MIT), built on [zxing-wasm](https://github.com/Sec-ant/zxing-wasm). To self-host the wasm, see its `prepareZXingModule` docs.
- [jsQR](https://github.com/cozmo/jsQR) for single codes.
- [qrcode-generator](https://www.npmjs.com/package/qrcode-generator), used by the print page.

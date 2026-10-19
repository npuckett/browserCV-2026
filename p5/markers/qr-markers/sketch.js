// ==============================================
// QR MARKERS — QR codes as cheap printable markers
// ==============================================
// Any QR code can be a marker: its corners say where it is, and its text says
// what it means. Print some from markers/print-qr.html. This sketch fills
// each code with the color its text names ("red", "blue", "#ff8800") and
// labels it with the text.
//
// Detector:
//   The browser's own BarcodeDetector where it supports QR codes (Chrome on
//   Android, macOS and ChromeOS). Everywhere else, including iPhones, the
//   barcode-detector "ponyfill": the same API, built on the ZXing C++ library
//   compiled to WebAssembly. Both find several codes at once.
//
// Key data:
//   codes      [{ text, corners: [{ x, y } ×4], center }] in canvas pixels,
//              corners clockwise from the code's top-left
//   method     'native' or 'zxing-wasm'
// ==============================================

let cam;
let detector = null;
let method = '';
let codes = [];
let busy = false;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  chooseDetector();
}

// Feature-detect: the class can exist without supporting QR on this platform.
async function chooseDetector() {
  try {
    if ('BarcodeDetector' in window) {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (formats.includes('qr_code')) {
        detector = new BarcodeDetector({ formats: ['qr_code'] });
        method = 'native';
        return;
      }
    }
  } catch (error) {
    // fall through to the ponyfill
  }
  // BarcodeDetectionAPI comes from the ponyfill <script> in index.html. It
  // downloads its 1 MB wasm the first time detect() runs.
  detector = new BarcodeDetectionAPI.BarcodeDetector({ formats: ['qr_code'] });
  method = 'zxing-wasm';
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  // detect() is async: keep one call in flight, and only for new frames.
  if (detector && cam.ready && !busy && isNewFrame(cam)) {
    busy = true;
    detector.detect(cam.videoElement)
      .then((found) => {
        // cornerPoints are in video pixels; map them onto the canvas.
        codes = found.map((barcode) => toCode(barcode.rawValue,
          barcode.cornerPoints.map((p) => cam.mapPoint(p.x, p.y))));
      })
      .catch((error) => console.warn(error))
      .finally(() => { busy = false; });
  }

  for (const code of codes) drawCode(code);
  drawPanel();
}

function toCode(content, corners) {
  return {
    text: content,
    corners: corners,
    center: {
      x: corners.reduce((sum, p) => sum + p.x, 0) / corners.length,
      y: corners.reduce((sum, p) => sum + p.y, 0) / corners.length
    }
  };
}

function drawCode(code) {
  // A code whose text is a CSS color fills with that color; anything else is
  // gray. CSS.supports() asks the browser whether the text is a valid color.
  const content = code.text.trim();
  const fillColor = CSS.supports('color', content) ? color(content) : color(160);
  fillColor.setAlpha(150);

  fill(fillColor);
  stroke(255);
  strokeWeight(3);
  beginShape();
  for (const p of code.corners) vertex(p.x, p.y);
  endShape(CLOSE);

  noStroke();
  fill(255, 60, 60);
  circle(code.corners[0].x, code.corners[0].y, 10); // the code's top-left corner

  const label = content.length > 40 ? content.slice(0, 40) + '…' : content;
  textSize(16);
  textAlign(CENTER, CENTER);
  fill(0, 190);
  rect(code.center.x - textWidth(label) / 2 - 8, code.center.y - 14, textWidth(label) + 16, 28, 6);
  fill(255);
  text(label, code.center.x, code.center.y);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 52, width, 52);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  const message = !cam.ready ? 'Waiting for camera'
    : codes.length ? codes.length + ' code' + (codes.length > 1 ? 's' : '') + ' · ' + method
    : 'Show a QR code (print some from markers/print-qr.html) · ' + method;
  text(message, 16, height - 26);
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

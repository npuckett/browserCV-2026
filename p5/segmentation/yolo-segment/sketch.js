// ==============================================
// YOLO SEGMENT — object outlines, not just boxes
// ==============================================
// YOLO26 nano segmentation finds the same 80 COCO objects as yolo-detect,
// plus the pixels each object covers. The library returns all masks merged
// into one colored image, which the sketch lays over the video.
//
// Key data:
//   results.boxes     [{ x1, y1, x2, y2, conf, name, color }] in video pixels
//   results.masks     one RGBA image, results.width × results.height × 4 bytes,
//                     each object painted in its box color, background clear.
//                     (Per-object masks are not exposed by the library.)
//   coverage          0..1, how much of the frame any object covers
//
// Tap to switch between video + masks and masks on black.
// ==============================================

const YOLO_URL = 'https://cdn.jsdelivr.net/npm/@ultralytics/yolo@0.0.51/+esm';
const MODEL_URL = '../../../models/yolo26n-seg.onnx';

let cam;
let yolo = null;
let modelDevice = '';
let results = null;
let maskImage = null;
let coverage = 0;
let busy = false;
let showVideo = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  loadYolo();
}

async function loadYolo() {
  try {
    setLoading('Loading YOLO library');
    const { YOLO } = await import(YOLO_URL);
    setLoading('Downloading model and runtime (about 17 MB)');
    yolo = await YOLO.load(MODEL_URL, { device: 'auto' });
    modelDevice = yolo.device; // read now: touching the model during predict() throws
    clearLoading();
  } catch (error) {
    setError('Could not load YOLO: ' + error.message);
  }
}

function draw() {
  background(0);
  if (showVideo) drawPhoneCamera(cam);

  if (yolo && cam.ready && !busy && isNewFrame(cam)) {
    busy = true;
    yolo.predict(cam.videoElement, { conf: 0.35 })
      .then((output) => {
        results = output;
        updateMask(output);
      })
      .catch((error) => console.warn(error))
      .finally(() => { busy = false; });
  }

  if (maskImage) drawOverCamera(cam, maskImage);
  if (results) drawLabels();
  drawPanel();
  drawStatus();
}

// Copy the library's RGBA bytes into a p5.Image the size of the video frame.
function updateMask(output) {
  if (!maskImage || maskImage.width !== output.width || maskImage.height !== output.height) {
    maskImage = createImage(output.width, output.height);
  }
  maskImage.loadPixels();
  const source = output.masks;
  let covered = 0;
  if (source.length === maskImage.pixels.length) {
    for (let i = 0; i < source.length; i += 4) {
      maskImage.pixels[i] = source[i];
      maskImage.pixels[i + 1] = source[i + 1];
      maskImage.pixels[i + 2] = source[i + 2];
      // The library paints masks at partial alpha. Make them bolder.
      maskImage.pixels[i + 3] = source[i + 3] > 0 ? 190 : 0;
      if (source[i + 3] > 0) covered += 1;
    }
  } else {
    maskImage.pixels.fill(0); // no objects: the library returns an empty array
  }
  maskImage.updatePixels();
  coverage = covered / (output.width * output.height);
}

function drawLabels() {
  textSize(14);
  textAlign(LEFT, CENTER);
  for (const box of results.boxes) {
    const cornerA = cam.mapPoint(box.x1, box.y1);
    const cornerB = cam.mapPoint(box.x2, box.y2);
    const x = Math.min(cornerA.x, cornerB.x);
    const y = Math.min(cornerA.y, cornerB.y);
    const label = box.name + ' ' + round(box.conf * 100) + '%';
    noStroke();
    fill(box.color);
    rect(x, y - 22, textWidth(label) + 12, 22, 4);
    fill(0);
    text(label, x + 6, y - 11);
  }
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 52, width, 52);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  const speed = results ? round(results.speed.inference) + ' ms' : '–';
  const count = results ? results.boxes.length : 0;
  const message = cam.ready
    ? count + ' objects cover ' + round(coverage * 100) + '% · ' + (modelDevice || '…') + ' · ' + speed + ' · tap: ' + (showVideo ? 'masks only' : 'show video')
    : 'Waiting for camera';
  text(message, 16, height - 26);
}

function mousePressed() {
  if (cameraSwitchJustPressed() || !cam.ready) return false;
  showVideo = !showVideo;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

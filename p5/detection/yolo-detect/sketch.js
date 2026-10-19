// ==============================================
// YOLO DETECT — find the 80 COCO objects
// ==============================================
// Runs Ultralytics YOLO26 nano in the browser with @ultralytics/yolo. It uses
// WebGPU when the browser has it and falls back to the CPU (wasm) when not.
// Boxes and labels are drawn with p5 so you can see the data, and the sketch
// keeps a simple `detections` array you can ask questions of:
// "is there a cup, and where?"
//
// The library is an ES module. Global-mode p5 sketches are classic scripts,
// so it is loaded with a dynamic import() (the same pattern as Golan Levin's
// MediaPipe sketch: https://editor.p5js.org/golan/sketches/0XkgzZGe8).
//
// Key data:
//   results          raw library output: { boxes, width, height, speed, ... }
//   results.boxes    [{ x1, y1, x2, y2, conf, cls, name, color }] in video pixels
//   detections       [{ label, confidence, x, y, w, h, centerX, centerY }] in canvas pixels
//   findObject(label)  the most confident detection with that label, or null
//
// Tap or click to change which object the sketch is looking for.
// ==============================================

const YOLO_URL = 'https://cdn.jsdelivr.net/npm/@ultralytics/yolo@0.0.51/+esm';
const MODEL_URL = '../../../models/yolo26n.onnx';

let cam;
let yolo = null;
let modelDevice = '';   // 'webgpu' or 'cpu', read once after loading
let results = null;
let detections = [];
let busy = false;

// The object the sketch is "looking for". Tap to cycle through these.
const QUERIES = ['person', 'cup', 'bottle', 'cell phone', 'book', 'laptop', 'chair', 'dog', 'cat'];
let queryIndex = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // Objects are easiest with the rear camera on a phone; desktop webcams face you.
  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  // Start loading right away (no await), so draw() can show the spinner.
  loadYolo();
}

async function loadYolo() {
  try {
    setLoading('Loading YOLO library');
    const { YOLO } = await import(YOLO_URL);
    setLoading('Downloading model and runtime (about 16 MB)');
    // device 'auto' tries WebGPU first and falls back to CPU.
    yolo = await YOLO.load(MODEL_URL, { device: 'auto' });
    // Read model properties now. Touching the model while predict() runs
    // throws a "recursive use of an object" error from the wasm side.
    modelDevice = yolo.device;
    clearLoading();
  } catch (error) {
    setError('Could not load YOLO: ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  // One prediction at a time. predict() is async, so draw() keeps running
  // while the model works, and results update when it finishes.
  if (yolo && cam.ready && !busy && isNewFrame(cam)) {
    busy = true;
    yolo.predict(cam.videoElement, { conf: 0.35 })
      .then((output) => {
        results = output;
        detections = toDetections(output);
      })
      .catch((error) => console.warn(error))
      .finally(() => { busy = false; });
  }

  drawDetections();
  drawQuery();
  drawPanel();
  if (!cam.ready && !isLoading()) drawWaiting();
  drawStatus();
}

// Convert the library's boxes (video pixels, corner points) into canvas
// rectangles that line up with the drawn video.
function toDetections(output) {
  return output.boxes.map((box) => {
    const cornerA = cam.mapPoint(box.x1, box.y1);
    const cornerB = cam.mapPoint(box.x2, box.y2);
    const x = Math.min(cornerA.x, cornerB.x);
    const y = Math.min(cornerA.y, cornerB.y);
    const w = Math.abs(cornerB.x - cornerA.x);
    const h = Math.abs(cornerB.y - cornerA.y);
    return {
      label: box.name,
      confidence: box.conf,
      color: box.color,
      x: x, y: y, w: w, h: h,
      centerX: x + w / 2,
      centerY: y + h / 2
    };
  });
}

// Ask the detections a question: the most confident match for a label.
function findObject(label) {
  let best = null;
  for (const detection of detections) {
    if (detection.label === label && (!best || detection.confidence > best.confidence)) {
      best = detection;
    }
  }
  return best;
}

function drawDetections() {
  textSize(14);
  for (const detection of detections) {
    noFill();
    stroke(detection.color);
    strokeWeight(3);
    rect(detection.x, detection.y, detection.w, detection.h, 4);

    const label = detection.label + ' ' + round(detection.confidence * 100) + '%';
    const labelWidth = textWidth(label) + 12;
    noStroke();
    fill(detection.color);
    rect(detection.x, detection.y - 22, labelWidth, 22, 4);
    fill(0);
    textAlign(LEFT, CENTER);
    text(label, detection.x + 6, detection.y - 11);
  }
}

// Point at the object we're looking for, if it's there.
function drawQuery() {
  const target = findObject(QUERIES[queryIndex]);
  if (!target) return;
  stroke(255);
  strokeWeight(4);
  noFill();
  circle(target.centerX, target.centerY, 26);
  line(width / 2, height - 60, target.centerX, target.centerY);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 60, width, 60);

  const label = QUERIES[queryIndex];
  const target = findObject(label);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(16);
  const answer = target
    ? 'yes, at ' + round(target.centerX) + ', ' + round(target.centerY)
    : 'no';
  text('Is there a ' + label + '? ' + answer, 16, height - 40);

  fill(170);
  textSize(13);
  const device = modelDevice || '…';
  const speed = results ? round(results.speed.inference) + ' ms' : '–';
  text(detections.length + ' objects · ' + device + ' · inference ' + speed + ' · tap to change object', 16, height - 18);
}

function drawWaiting() {
  fill(247);
  textAlign(CENTER, CENTER);
  textSize(16);
  text('Waiting for camera', width / 2, height / 2);
}

function mousePressed() {
  // Ignore the tap that starts the camera, and taps on the camera button.
  if (cameraSwitchJustPressed() || !cam.ready) return false;
  queryIndex = (queryIndex + 1) % QUERIES.length;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ==============================================
// MEDIAPIPE OBJECT DETECTOR
// ==============================================
// MediaPipe's ObjectDetector with the EfficientDet-Lite0 model finds the 80
// COCO objects. It is smaller to download than YOLO and runs on WebGL, so it
// works in browsers without WebGPU. MediaPipe Tasks is used directly, without
// ml5, loaded with a dynamic import() like Golan Levin's sketch:
// https://editor.p5js.org/golan/sketches/0XkgzZGe8
//
// Key data:
//   result.detections   [{ categories: [{ categoryName, score }],
//                          boundingBox: { originX, originY, width, height } }]
//                       boxes are in video pixels
//   counts              { person: 2, cup: 1, ... } for the current frame
// ==============================================

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';

let cam;
let detector = null;
let delegate = '';
let result = null;
let counts = {};
let lastTimestamp = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  loadDetector();
}

async function loadDetector() {
  try {
    setLoading('Loading MediaPipe');
    // vision_bundle.mjs is the ES module build. (vision_bundle.js is not a module.)
    const { ObjectDetector, FilesetResolver } = await import(MP_URL + '/vision_bundle.mjs');
    // The wasm files must come from the same version as the bundle.
    const vision = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');

    setLoading('Downloading model (7 MB)');
    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      scoreThreshold: 0.4,
      maxResults: 10
    };
    try {
      detector = await ObjectDetector.createFromOptions(vision, options);
      delegate = 'GPU';
    } catch (gpuError) {
      // The GPU delegate needs WebGL2. Fall back to the CPU if it fails.
      options.baseOptions.delegate = 'CPU';
      detector = await ObjectDetector.createFromOptions(vision, options);
      delegate = 'CPU';
    }
    clearLoading();
  } catch (error) {
    setError('Could not load MediaPipe: ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  const video = cam.videoElement;
  if (detector && isNewFrame(cam) && video.videoWidth > 0) {
    // detectForVideo is synchronous: it blocks draw() until it finishes.
    // Timestamps must always increase, even if two frames share a millisecond.
    lastTimestamp = Math.max(performance.now(), lastTimestamp + 1);
    result = detector.detectForVideo(video, lastTimestamp);
    counts = countCategories(result);
  }

  if (result) drawDetections();
  drawPanel();
  drawStatus();
}

function countCategories(detectionResult) {
  const tally = {};
  for (const detection of detectionResult.detections) {
    const name = detection.categories[0].categoryName;
    tally[name] = (tally[name] || 0) + 1;
  }
  return tally;
}

function drawDetections() {
  textSize(14);
  textAlign(LEFT, CENTER);
  for (const detection of result.detections) {
    const box = detection.boundingBox;
    const category = detection.categories[0];
    // Map two corners from video pixels to canvas pixels (handles the mirror).
    const cornerA = cam.mapPoint(box.originX, box.originY);
    const cornerB = cam.mapPoint(box.originX + box.width, box.originY + box.height);
    const x = Math.min(cornerA.x, cornerB.x);
    const y = Math.min(cornerA.y, cornerB.y);

    noFill();
    stroke(0, 220, 160);
    strokeWeight(3);
    rect(x, y, Math.abs(cornerB.x - cornerA.x), Math.abs(cornerB.y - cornerA.y), 4);

    const label = category.categoryName + ' ' + round(category.score * 100) + '%';
    noStroke();
    fill(0, 220, 160);
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
  const summary = Object.entries(counts).map(([name, count]) => count + ' ' + name).join(', ');
  let message = 'Waiting for camera';
  if (cam.ready) message = (summary || 'nothing found') + (delegate ? ' · ' + delegate : '');
  text(message, 16, height - 26);
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

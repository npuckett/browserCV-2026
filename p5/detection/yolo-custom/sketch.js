// ==============================================
// YOLO CUSTOM — a template for your own trained model
// ==============================================
// Load a YOLO model you trained yourself (see README.md for the Colab train
// and export steps). The sketch reads the task and class names stored inside
// the .onnx file, so it works for detect, segment, pose, classify and obb
// models without code changes.
//
// Two ways to load a model:
//   1. Put the file in models/ and change MODEL_URL below.
//   2. Use the "Load .onnx" button to pick a file from this computer or
//      phone. Nothing is uploaded; the file is read in the browser.
//
// Key data:
//   modelInfo        { task, names, device } read from the model after loading
//   results.boxes    [{ x1, y1, x2, y2, conf, cls, name, color }] (detect/segment/pose)
//   results.obb      [{ x, y, w, h, angle, conf, name, color }] (rotated boxes, angle in radians)
//   results.probs    { top1, top1conf, top5, top5conf, name, top5names } (classify)
//   detections       boxes converted to canvas pixels
// ==============================================

const YOLO_URL = 'https://cdn.jsdelivr.net/npm/@ultralytics/yolo@0.0.51/+esm';
// Change this to your model, e.g. '../../../models/my-model.onnx'.
const MODEL_URL = '../../../models/yolo26n.onnx';

let YOLO = null;
let cam;
let yolo = null;
let modelInfo = null;
let results = null;
let detections = [];
let busy = false;
let fileButton;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });
  createFileButton();

  startYolo(MODEL_URL);
}

// source can be a URL string or a File/Blob.
async function startYolo(source) {
  try {
    setLoading('Loading YOLO library');
    if (!YOLO) ({ YOLO } = await import(YOLO_URL));
    setLoading('Loading model');
    const previous = yolo;
    yolo = null;
    results = null;
    detections = [];
    // Wait for any prediction still running, then release the old model.
    while (busy) await new Promise((resolve) => setTimeout(resolve, 20));
    if (previous) previous.free();
    const loaded = await YOLO.load(source, { device: 'auto' });
    // Read everything we need now. Touching the model during predict() throws.
    modelInfo = { task: loaded.task, names: loaded.names, device: loaded.device };
    yolo = loaded;
    clearLoading();
  } catch (error) {
    // The usual cause: an .onnx exported without Ultralytics metadata.
    setError('Could not load the model: ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  if (yolo && cam.ready && !busy && isNewFrame(cam)) {
    busy = true;
    const running = yolo;
    running.predict(cam.videoElement, { conf: 0.35 })
      .then((output) => {
        if (running !== yolo) return; // a new model was loaded meanwhile
        results = output;
        detections = output.boxes.map(toCanvasBox);
      })
      .catch((error) => console.warn(error))
      .finally(() => { busy = false; });
  }

  if (results) {
    if (results.task === 'classify') drawClassification();
    else if (results.task === 'obb') drawRotatedBoxes();
    else drawBoxes();
  }
  drawPanel();
  drawStatus();
}

function toCanvasBox(box) {
  const cornerA = cam.mapPoint(box.x1, box.y1);
  const cornerB = cam.mapPoint(box.x2, box.y2);
  return {
    label: box.name,
    confidence: box.conf,
    color: box.color,
    x: Math.min(cornerA.x, cornerB.x),
    y: Math.min(cornerA.y, cornerB.y),
    w: Math.abs(cornerB.x - cornerA.x),
    h: Math.abs(cornerB.y - cornerA.y)
  };
}

function drawBoxes() {
  textSize(14);
  textAlign(LEFT, CENTER);
  for (const box of detections) {
    noFill();
    stroke(box.color);
    strokeWeight(3);
    rect(box.x, box.y, box.w, box.h, 4);
    const label = box.label + ' ' + round(box.confidence * 100) + '%';
    noStroke();
    fill(box.color);
    rect(box.x, box.y - 22, textWidth(label) + 12, 22, 4);
    fill(0);
    text(label, box.x + 6, box.y - 11);
  }
}

// Oriented boxes: a center, a size and an angle.
function drawRotatedBoxes() {
  const dims = cam.getDimensions();
  for (const box of results.obb) {
    const center = cam.mapPoint(box.x, box.y);
    push();
    translate(center.x, center.y);
    // A mirrored view flips the rotation direction.
    rotate(cam.mirror ? -box.angle : box.angle);
    noFill();
    stroke(box.color);
    strokeWeight(3);
    rectMode(CENTER);
    rect(0, 0, box.w * dims.scaleX, box.h * dims.scaleY);
    pop();
    noStroke();
    fill(box.color);
    textAlign(CENTER, CENTER);
    textSize(13);
    text(box.name, center.x, center.y);
  }
}

// Classification: the top five labels for the whole frame.
function drawClassification() {
  const probs = results.probs;
  if (!probs) return;
  const barWidth = min(width - 40, 360);
  textSize(15);
  for (let i = 0; i < probs.top5.length; i += 1) {
    const y = 80 + i * 34;
    noStroke();
    fill(0, 160);
    rect(20, y, barWidth, 28, 4);
    fill(i === 0 ? '#ffd200' : 'rgba(255,255,255,0.6)');
    rect(20, y, barWidth * probs.top5conf[i], 28, 4);
    fill(255);
    textAlign(LEFT, CENTER);
    text(probs.top5names[i] + ' ' + round(probs.top5conf[i] * 100) + '%', 28, y + 14);
  }
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 60, width, 60);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  if (modelInfo) {
    const classCount = Object.keys(modelInfo.names).length;
    const speed = results ? round(results.speed.inference) + ' ms' : '–';
    text(modelInfo.task + ' model · ' + classCount + ' classes · ' + modelInfo.device + ' · ' + speed, 16, height - 40);
    fill(170);
    textSize(13);
    const someNames = Object.values(modelInfo.names).slice(0, 6).join(', ');
    text('classes: ' + someNames + (classCount > 6 ? ', …' : ''), 16, height - 18);
  } else {
    text(cam.ready ? 'No model loaded' : 'Waiting for camera', 16, height - 30);
  }
}

// A native file input, styled as a button, for picking an .onnx file.
function createFileButton() {
  const input = createElement('input');
  input.attribute('type', 'file');
  input.attribute('accept', '.onnx');
  input.style('display', 'none');
  input.elt.addEventListener('change', () => {
    const file = input.elt.files[0];
    if (file) startYolo(file);
  });

  fileButton = createButton('Load .onnx');
  fileButton.position(14, 70);
  fileButton.style('position', 'fixed');
  fileButton.style('z-index', '20');
  fileButton.style('padding', '10px 14px');
  fileButton.style('font', '700 14px system-ui, sans-serif');
  fileButton.style('border', '0');
  fileButton.style('border-radius', '8px');
  fileButton.style('background', '#ffd200');
  fileButton.mousePressed(() => input.elt.click());
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

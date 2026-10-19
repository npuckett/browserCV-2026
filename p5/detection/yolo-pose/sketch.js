// ==============================================
// YOLO POSE — skeletons for everyone in view
// ==============================================
// YOLO26 nano pose finds every person in the frame and 17 keypoints for each
// (the COCO layout). Unlike single-person pose models, it handles a crowd.
// The sketch draws each skeleton and flags people with both hands raised.
//
// Key data:
//   results.boxes      one box per person: { x1, y1, x2, y2, conf } in video pixels
//   results.keypoints  one entry per box, same order:
//                      { points: [[x, y, conf], ...17], color }
//   people             [{ points: [{ x, y, conf }], handsUp }] in canvas pixels
//
// COCO keypoint indices:
//   0 nose · 1/2 eyes · 3/4 ears · 5/6 shoulders · 7/8 elbows · 9/10 wrists
//   11/12 hips · 13/14 knees · 15/16 ankles (odd = left, even = right)
// ==============================================

const YOLO_URL = 'https://cdn.jsdelivr.net/npm/@ultralytics/yolo@0.0.51/+esm';
const MODEL_URL = '../../../models/yolo26n-pose.onnx';

// Pairs of keypoints joined by a bone.
const SKELETON = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],        // shoulders and arms
  [5, 11], [6, 12], [11, 12],                     // torso
  [11, 13], [13, 15], [12, 14], [14, 16],         // legs
  [0, 1], [0, 2], [1, 3], [2, 4]                  // face
];
const KEYPOINT_CONFIDENCE = 0.4;

let cam;
let yolo = null;
let modelDevice = '';
let results = null;
let people = [];
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

  loadYolo();
}

async function loadYolo() {
  try {
    setLoading('Loading YOLO library');
    const { YOLO } = await import(YOLO_URL);
    setLoading('Downloading model and runtime (about 18 MB)');
    yolo = await YOLO.load(MODEL_URL, { device: 'auto' });
    modelDevice = yolo.device; // read now: touching the model during predict() throws
    clearLoading();
  } catch (error) {
    setError('Could not load YOLO: ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  if (yolo && cam.ready && !busy && isNewFrame(cam)) {
    busy = true;
    yolo.predict(cam.videoElement, { conf: 0.4 })
      .then((output) => {
        results = output;
        people = toPeople(output);
      })
      .catch((error) => console.warn(error))
      .finally(() => { busy = false; });
  }

  for (const person of people) {
    drawPerson(person);
  }
  drawPanel();
  drawStatus();
}

function toPeople(output) {
  return output.keypoints.map((entry) => {
    const points = entry.points.map(([x, y, conf]) => {
      const mapped = cam.mapPoint(x, y);
      return { x: mapped.x, y: mapped.y, conf: conf };
    });
    // Hands up: both wrists confidently above the nose (smaller y is higher).
    const nose = points[0];
    const handsUp = [9, 10].every((i) => points[i].conf > KEYPOINT_CONFIDENCE && points[i].y < nose.y) &&
      nose.conf > KEYPOINT_CONFIDENCE;
    return { points: points, color: entry.color, handsUp: handsUp };
  });
}

function drawPerson(person) {
  const points = person.points;
  stroke(person.handsUp ? '#ffd200' : person.color);
  strokeWeight(person.handsUp ? 6 : 4);
  for (const [a, b] of SKELETON) {
    if (points[a].conf > KEYPOINT_CONFIDENCE && points[b].conf > KEYPOINT_CONFIDENCE) {
      line(points[a].x, points[a].y, points[b].x, points[b].y);
    }
  }
  noStroke();
  fill(255);
  for (const point of points) {
    if (point.conf > KEYPOINT_CONFIDENCE) circle(point.x, point.y, 8);
  }
  if (person.handsUp && points[0].conf > KEYPOINT_CONFIDENCE) {
    fill('#ffd200');
    textAlign(CENTER, BOTTOM);
    textSize(16);
    text('HANDS UP', points[0].x, points[0].y - 40);
  }
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 52, width, 52);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  const raised = people.filter((person) => person.handsUp).length;
  const speed = results ? round(results.speed.inference) + ' ms' : '–';
  const message = cam.ready
    ? people.length + ' people · ' + raised + ' with hands up · ' + (modelDevice || '…') + ' · ' + speed
    : 'Waiting for camera';
  text(message, 16, height - 26);
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// ==============================================
// MEDIAPIPE GESTURE RECOGNIZER — draw in the air
// ==============================================
// MediaPipe's GestureRecognizer finds hands, their 21 landmarks, and one of
// seven built-in gestures per hand. Here the gestures are controls:
//   ☝ Pointing_Up   draw with your index fingertip
//   ✋ Open_Palm     clear the drawing
//   👍 Thumb_Up      change the color
// The other built-in gestures are Closed_Fist, Thumb_Down, Victory and
// ILoveYou ("None" means a hand with no recognized gesture).
//
// MediaPipe is loaded the way Golan Levin's p5 sketches load it: a dynamic
// import() from a global-mode sketch (https://editor.p5js.org/golan/sketches/0XkgzZGe8).
//
// Key data:
//   result.gestures     per hand: [{ categoryName, score }] (best first)
//   result.handedness   per hand: [{ categoryName: 'Left' | 'Right', score }]
//   result.landmarks    per hand: 21 × { x, y, z }, x and y from 0 to 1
//   hands               [{ gesture, score, side, points }] with points in canvas pixels
// ==============================================

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const COLORS = ['#ffd200', '#ff4f7b', '#3fd0ff', '#7dff6a', '#ffffff'];

let cam;
let recognizer = null;
let delegate = '';
let result = null;
let hands = [];
let lastTimestamp = 0;

let drawing;            // p5.Graphics that keeps the strokes
let colorIndex = 0;
let previousTip = null; // last fingertip position while drawing
let previousGesture = '';

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');
  drawing = createGraphics(width, height);

  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  loadRecognizer();
}

async function loadRecognizer() {
  try {
    setLoading('Loading MediaPipe');
    const { GestureRecognizer, FilesetResolver } = await import(MP_URL + '/vision_bundle.mjs');
    const vision = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');

    setLoading('Downloading model (8 MB)');
    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2
    };
    try {
      recognizer = await GestureRecognizer.createFromOptions(vision, options);
      delegate = 'GPU';
    } catch (gpuError) {
      options.baseOptions.delegate = 'CPU';
      recognizer = await GestureRecognizer.createFromOptions(vision, options);
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
  if (recognizer && isNewFrame(cam) && video.videoWidth > 0) {
    lastTimestamp = Math.max(performance.now(), lastTimestamp + 1);
    result = recognizer.recognizeForVideo(video, lastTimestamp);
    hands = toHands(result, video);
    useGestures();
  }

  image(drawing, 0, 0);
  for (const hand of hands) drawHand(hand);
  drawPanel();
  drawStatus();
}

// Landmarks are normalized (0 to 1). Scale to video pixels, then map to the canvas.
function toHands(recognition, video) {
  return recognition.landmarks.map((landmarks, i) => {
    const best = recognition.gestures[i][0];
    return {
      gesture: best ? best.categoryName : 'None',
      score: best ? best.score : 0,
      side: recognition.handedness[i][0].categoryName,
      points: landmarks.map((p) => cam.mapPoint(p.x * video.videoWidth, p.y * video.videoHeight))
    };
  });
}

// Turn the first hand's gesture into actions.
function useGestures() {
  const hand = hands[0];
  const gesture = hand ? hand.gesture : 'None';

  if (gesture === 'Pointing_Up') {
    const tip = hand.points[8]; // index fingertip
    if (previousTip) {
      drawing.stroke(COLORS[colorIndex]);
      drawing.strokeWeight(10);
      drawing.line(previousTip.x, previousTip.y, tip.x, tip.y);
    }
    previousTip = tip;
  } else {
    previousTip = null;
  }

  // Act once when a gesture starts, not on every frame it is held.
  if (gesture !== previousGesture) {
    if (gesture === 'Open_Palm') drawing.clear();
    if (gesture === 'Thumb_Up') colorIndex = (colorIndex + 1) % COLORS.length;
  }
  previousGesture = gesture;
}

function drawHand(hand) {
  noStroke();
  fill(255, 160);
  for (const point of hand.points) circle(point.x, point.y, 7);

  // Label near the wrist
  const wrist = hand.points[0];
  const label = hand.gesture + ' ' + round(hand.score * 100) + '%';
  textSize(15);
  textAlign(CENTER, CENTER);
  fill(0, 180);
  rect(wrist.x - textWidth(label) / 2 - 8, wrist.y + 14, textWidth(label) + 16, 26, 6);
  fill(255);
  text(label, wrist.x, wrist.y + 27);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 52, width, 52);
  fill(COLORS[colorIndex]);
  circle(30, height - 26, 22);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  const message = cam.ready
    ? '☝ draw · ✋ clear · 👍 color' + (delegate ? ' · ' + delegate : '')
    : 'Waiting for camera';
  text(message, 52, height - 26);
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // Keep the strokes: copy the old drawing into a layer of the new size.
  // max(1, ...) because a hidden window can briefly report a size of 0.
  const resized = createGraphics(max(1, width), max(1, height));
  resized.image(drawing, 0, 0);
  drawing = resized;
}

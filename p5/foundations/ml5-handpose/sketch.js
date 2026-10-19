// ==============================================
// ml5 HANDPOSE — two points
// ==============================================
// ml5's HandPose finds 21 landmarks per hand. This sketch picks two of them
// (thumb tip and index tip), maps them onto the canvas with the PhoneCamera
// helpers, and measures the distance and angle between them. A short
// distance counts as a pinch.
//
// Adapted from p5-phone's examples/ml5/PHONE_HandPose_two_points, which also
// tracks velocity and more points. Full-window here so it works on desktop.
//
// Key data:
//   hands                 ml5 results: [{ keypoints: [{ x, y, name }], handedness, ... }]
//   pointA, pointB        the two tracked keypoints in canvas pixels, or null
//   pinchDistance         distance between them in canvas pixels
//   pinchAngle            angle from A to B in degrees, 0 = pointing right
//
// HandPose keypoint indices:
//   0 wrist · thumb 1-4 · index 5-8 · middle 9-12 · ring 13-16 · pinky 17-20
//   (the last number of each finger is its tip)
// ==============================================

let cam;
let handPose;
let hands = [];
let showVideo = true;

// Change these to track any two of the 21 points.
let pointIndexA = 4;   // thumb tip
let pointIndexB = 8;   // index finger tip
let pointA = null;
let pointB = null;
let pinchDistance = 0;
let pinchAngle = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // Hands are easiest with the front camera, on desktop and phone.
  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam, {
    onBeforeSwitch: () => { if (handPose) handPose.detectStop(); hands = []; },
    onAfterSwitch: () => { if (handPose) handPose.detectStart(cam.videoElement, gotHands); }
  });
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  setLoading('Waiting for camera');
  cam.onReady(() => {
    setLoading('Loading HandPose');
    // runtime 'mediapipe' loads from jsDelivr in a second or two.
    // flipped false: PhoneCamera's map helpers already handle the mirror.
    const options = { maxHands: 2, runtime: 'mediapipe', flipped: false };
    // In a p5 sketch, start detecting from ml5's ready callback, not after await.
    handPose = ml5.handPose(options, () => {
      handPose.detectStart(cam.videoElement, gotHands);
      clearLoading();
    });
  });
}

function gotHands(results) {
  hands = results || [];
}

function draw() {
  background(16, 19, 24);
  if (showVideo) drawPhoneCamera(cam);

  pointA = null;
  pointB = null;

  for (const hand of hands) {
    // All 21 keypoints, small and faint
    for (const keypoint of cam.mapKeypoints(hand.keypoints)) {
      noStroke();
      fill(255, 255, 255, 140);
      circle(keypoint.x, keypoint.y, 8);
    }
  }

  if (hands.length > 0) {
    pointA = cam.mapKeypoint(hands[0].keypoints[pointIndexA]);
    pointB = cam.mapKeypoint(hands[0].keypoints[pointIndexB]);
    pinchDistance = dist(pointA.x, pointA.y, pointB.x, pointB.y);
    pinchAngle = degrees(atan2(pointB.y - pointA.y, pointB.x - pointA.x));
    drawMeasurement();
  }

  drawPanel();
  drawStatus();
}

function drawMeasurement() {
  // Pinch threshold scales with screen size so it feels the same on any device.
  const isPinching = pinchDistance < min(width, height) * 0.06;

  stroke(isPinching ? color(255, 210, 0) : color(255, 165, 0));
  strokeWeight(isPinching ? 6 : 3);
  line(pointA.x, pointA.y, pointB.x, pointB.y);

  noStroke();
  fill(255, 60, 60);
  circle(pointA.x, pointA.y, 22);
  fill(60, 120, 255);
  circle(pointB.x, pointB.y, 22);

  fill(255);
  textAlign(CENTER, BOTTOM);
  textSize(14);
  const midX = (pointA.x + pointB.x) / 2;
  const midY = (pointA.y + pointB.y) / 2;
  text(round(pinchDistance) + ' px · ' + round(pinchAngle) + '°' + (isPinching ? ' · PINCH' : ''), midX, midY - 14);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - 52, width, 52);
  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Show your hand';
  if (!cam.ready) message = 'Waiting for camera';
  else if (hands.length > 0) message = hands.length + ' hand' + (hands.length > 1 ? 's' : '') + ' · ' + hands[0].handedness;
  text(message + ' · tap to ' + (showVideo ? 'hide' : 'show') + ' video', 16, height - 26);
}

function mousePressed() {
  if (cameraSwitchJustPressed()) return false;
  if (cam.ready) showVideo = !showVideo;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

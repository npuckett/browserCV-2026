// ==============================================
// ARUCO MARKERS — printed squares as physical controls
// ==============================================
// js-aruco2 finds ArUco markers (black-and-white square codes) in the camera
// image. Each marker has an id, so each one can control something different.
// Print some from markers/print-aruco.html (dictionary ARUCO_MIP_36h12).
//
//   marker 0   turn it like a knob: sets the hue
//   marker 1   turn it like a knob: sets the size
//   marker 2   show it to switch the shape from circle to square
//
// js-aruco2 is plain JavaScript (no wasm, no GPU), so it runs the same on
// desktop and phone.
//
// Key data:
//   markers     js-aruco2 output: [{ id, corners: [{ x, y } ×4], hammingDistance }]
//               corners run clockwise from the marker's own top-left, in frame pixels
//   tracked     { [id]: { id, corners, center, angle, size } } in canvas pixels
//               angle 0..360 degrees: 0 = upright, growing clockwise as seen on screen
// ==============================================

let cam;
let detector;
let markers = [];
let tracked = {};

// The sketch parameters the markers control.
let shapeHue = 200;
let shapeSize = 80;
let useSquare = false;

const SCAN_SIZE = 640; // longer side of the frame given to the detector

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');
  colorMode(HSB, 360, 100, 100, 100);

  // On a phone, the rear camera looks down at markers on a table.
  // On desktop, hold markers up to the webcam.
  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  // maxHammingDistance: how many bits may be wrong and still match. The
  // dictionary default (12) accepts false matches, so use a stricter value.
  detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 });
}

function draw() {
  background(220, 20, 8);
  drawPhoneCamera(cam);

  if (isNewFrame(cam)) {
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) {
      markers = detector.detect(frame.imageData);
      tracked = {};
      for (const marker of markers) {
        tracked[marker.id] = describeMarker(marker, frame);
      }
    }
  }

  useMarkersAsControls();
  for (const marker of Object.values(tracked)) drawMarker(marker);
  drawControlledShape();
  drawPanel();
}

// Corners (frame pixels) -> canvas pixels, plus center, rotation and size.
function describeMarker(marker, frame) {
  const corners = marker.corners.map((corner) => mapFramePoint(cam, frame, corner));
  const center = {
    x: corners.reduce((sum, c) => sum + c.x, 0) / 4,
    y: corners.reduce((sum, c) => sum + c.y, 0) / 4
  };
  // The marker's top edge runs from corner 0 to corner 1, and its direction
  // is the marker's rotation. A mirrored view flips that edge left-to-right,
  // so measure it the other way round: upright reads 0° either way, and the
  // angle grows as the marker turns clockwise on screen.
  const [from, to] = cam.mirror ? [corners[1], corners[0]] : [corners[0], corners[1]];
  let angle = degrees(atan2(to.y - from.y, to.x - from.x));
  if (angle < 0) angle += 360;
  const size = (dist(corners[0].x, corners[0].y, corners[1].x, corners[1].y) +
                dist(corners[1].x, corners[1].y, corners[2].x, corners[2].y)) / 2;
  return { id: marker.id, corners: corners, center: center, angle: angle, size: size };
}

function useMarkersAsControls() {
  if (tracked[0]) shapeHue = tracked[0].angle;
  if (tracked[1]) shapeSize = map(tracked[1].angle, 0, 360, 30, maxShapeSize());
  useSquare = Boolean(tracked[2]);
}

function drawMarker(marker) {
  const c = marker.corners;
  noFill();
  stroke(140, 90, 100);
  strokeWeight(3);
  beginShape();
  for (const corner of c) vertex(corner.x, corner.y);
  endShape(CLOSE);

  // Corner 0 is the marker's own top-left: mark it so the orientation shows.
  noStroke();
  fill(0, 90, 100);
  circle(c[0].x, c[0].y, 12);

  // A knob pointer: from the center toward the marker's top edge.
  // (angle 0 = upright = pointing up, so subtract 90° for p5's 0 = right.)
  stroke(60, 90, 100);
  strokeWeight(3);
  const reach = marker.size * 0.7;
  line(marker.center.x, marker.center.y,
       marker.center.x + cos(radians(marker.angle - 90)) * reach,
       marker.center.y + sin(radians(marker.angle - 90)) * reach);

  noStroke();
  fill(0, 0, 100);
  textAlign(CENTER, CENTER);
  textSize(18);
  text('id ' + marker.id, marker.center.x, marker.center.y - marker.size * 0.7 - 14);
  textSize(13);
  text(round(marker.angle) + '°', marker.center.x, marker.center.y + marker.size * 0.7 + 14);
}

function maxShapeSize() {
  return min(width, height) * 0.3;
}

// The shape the markers control, bottom right above the panel.
function drawControlledShape() {
  const x = width - maxShapeSize() / 2 - 20;
  const y = height - 52 - maxShapeSize() / 2 - 20;
  noStroke();
  fill(shapeHue, 80, 100, 85);
  if (useSquare) {
    rectMode(CENTER);
    rect(x, y, shapeSize, shapeSize, 8);
    rectMode(CORNER);
  } else {
    circle(x, y, shapeSize);
  }
}

function drawPanel() {
  noStroke();
  fill(0, 0, 0, 80);
  rect(0, height - 52, width, 52);
  fill(0, 0, 100);
  textAlign(LEFT, CENTER);
  textSize(15);
  const ids = Object.keys(tracked);
  const message = !cam.ready ? 'Waiting for camera'
    : ids.length ? 'markers: ' + ids.join(', ') + ' · 0 = hue, 1 = size, 2 = square'
    : 'Show ArUco markers (ARUCO_MIP_36h12) from markers/print-aruco.html';
  text(message, 16, height - 26);
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

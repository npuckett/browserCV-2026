// ==============================================
// ml5 FACEMESH — mouth openness
// ==============================================
// ml5's FaceMesh finds 468 landmarks on a face. This sketch measures the gap
// between the upper and lower lip and divides it by the face width, so the
// value stays the same whether the face is near or far from the camera.
//
// Adapted from p5-phone's examples/ml5/PHONE_FaceMesh_two_points, which also
// measures eye angle and nose velocity. Full-window here so it works on desktop.
//
// Key data:
//   faces          ml5 results: [{ keypoints: [{ x, y, z }], box, ... }]
//   mouthOpen      lip gap / face width, about 0 (closed) to 0.5 (wide open)
//   headTilt       angle of the line between the cheeks, in degrees
//
// Useful keypoint indices:
//   1 nose tip area · 4 nose tip · 13 upper lip · 14 lower lip · 152 chin
//   234 left side of face · 454 right side of face
// ==============================================

let cam;
let faceMesh;
let faces = [];
let showVideo = true;

let upperLipIndex = 13;
let lowerLipIndex = 14;
let leftSideIndex = 234;
let rightSideIndex = 454;

let mouthOpen = 0;
let headTilt = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam, {
    onBeforeSwitch: () => { if (faceMesh) faceMesh.detectStop(); faces = []; },
    onAfterSwitch: () => { if (faceMesh) faceMesh.detectStart(cam.videoElement, gotFaces); }
  });
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  setLoading('Waiting for camera');
  cam.onReady(() => {
    setLoading('Loading FaceMesh');
    const options = { maxFaces: 1, refineLandmarks: false, runtime: 'mediapipe', flipped: false };
    faceMesh = ml5.faceMesh(options, () => {
      faceMesh.detectStart(cam.videoElement, gotFaces);
      clearLoading();
    });
  });
}

function gotFaces(results) {
  faces = results || [];
}

function draw() {
  background(16, 19, 24);
  if (showVideo) drawPhoneCamera(cam);

  if (faces.length > 0) {
    const points = cam.mapKeypoints(faces[0].keypoints);

    // The whole mesh as faint dots
    noStroke();
    fill(255, 255, 255, 90);
    for (const point of points) {
      circle(point.x, point.y, 3);
    }

    const upperLip = points[upperLipIndex];
    const lowerLip = points[lowerLipIndex];
    const leftSide = points[leftSideIndex];
    const rightSide = points[rightSideIndex];

    const faceWidth = dist(leftSide.x, leftSide.y, rightSide.x, rightSide.y);
    const lipGap = dist(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
    // Smooth a little so the value doesn't flicker.
    mouthOpen = lerp(mouthOpen, lipGap / faceWidth, 0.4);
    // Measure tilt from whichever cheek is on the left of the screen. The
    // mirrored front camera swaps them, and a level head should read 0°.
    const [screenLeft, screenRight] = leftSide.x < rightSide.x ? [leftSide, rightSide] : [rightSide, leftSide];
    headTilt = degrees(atan2(screenRight.y - screenLeft.y, screenRight.x - screenLeft.x));

    // Face width line
    stroke(255, 165, 0);
    strokeWeight(2);
    line(leftSide.x, leftSide.y, rightSide.x, rightSide.y);

    // Lip gap, colored by how open the mouth is
    stroke(lerpColor(color(60, 120, 255), color(255, 60, 60), constrain(mouthOpen * 3, 0, 1)));
    strokeWeight(5);
    line(upperLip.x, upperLip.y, lowerLip.x, lowerLip.y);
  }

  drawPanel();
  drawStatus();
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - 52, width, 52);

  // Meter for mouth openness
  fill(255, 40);
  rect(16, height - 14, width - 32, 6, 3);
  fill(255, 90, 90);
  rect(16, height - 14, (width - 32) * constrain(mouthOpen * 2, 0, 1), 6, 3);

  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Show your face';
  if (!cam.ready) message = 'Waiting for camera';
  else if (faces.length > 0) message = 'mouth ' + nf(mouthOpen, 1, 2) + ' · tilt ' + round(headTilt) + '°';
  text(message + ' · tap to ' + (showVideo ? 'hide' : 'show') + ' video', 16, height - 32);
}

function mousePressed() {
  if (cameraSwitchJustPressed()) return false;
  if (cam.ready) showVideo = !showVideo;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

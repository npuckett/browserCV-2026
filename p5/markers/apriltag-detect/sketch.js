// ==============================================
// APRILTAG DETECT — sturdy markers with distance
// ==============================================
// The official AprilTag C library, compiled to WebAssembly, finds tag36h11
// tags. It is harder to fool than js-aruco2, copes better with blur and low
// light, and also estimates each tag's position in 3D. Print tags from
// markers/print-apriltag.html.
//
// The detector runs in a Web Worker (vendor/apriltag/), so it never blocks
// draw(). Comlink makes the worker's methods look like ordinary async calls.
//
// Key data:
//   detections   [{ id, corners: [{ x, y } ×4], center, pose: { t, R, size } }]
//                corners and center in scan-frame pixels; t = [x, y, z] in meters
//   tags         [{ id, corners, center, distance }] with canvas pixels and
//                distance in meters
//
// The distance is only as good as two numbers you set below: the printed
// tag size and the camera's field of view.
// ==============================================

const TAG_SIZE_METERS = 0.06;   // the black square of your printed tags (60 mm)
const CAMERA_FOV_DEGREES = 60;  // horizontal field of view; most webcams and phones are 55–75
const SCAN_SIZE = 640;

let cam;
let detector = null;
let detectorReady = false;
let busy = false;
let tags = [];
let intrinsicsFor = '';  // frame size the camera intrinsics were set for

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  startDetector();
}

async function startDetector() {
  setLoading('Starting AprilTag detector');
  // The worker script must come from this site, so the files are vendored.
  const Apriltag = Comlink.wrap(new Worker('../../../vendor/apriltag/apriltag.js'));
  detector = await new Apriltag(Comlink.proxy(() => {
    detectorReady = true;
    clearLoading();
  }));
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  if (detectorReady && cam.ready && !busy && isNewFrame(cam)) {
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) detectTags(frame);
  }

  for (const tag of tags) drawTag(tag);
  drawPanel();
  drawStatus();
}

async function detectTags(frame) {
  busy = true;
  try {
    await updateIntrinsics(frame);

    // AprilTag wants one byte of brightness per pixel.
    const rgba = frame.imageData.data;
    const gray = new Uint8Array(frame.width * frame.height);
    for (let i = 0, j = 0; i < gray.length; i += 1, j += 4) {
      gray[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
    }

    const detections = await detector.detect(gray, frame.width, frame.height);
    if (Array.isArray(detections)) {
      tags = detections.map((d) => ({
        id: d.id,
        corners: d.corners.map((c) => mapFramePoint(cam, frame, c)),
        center: mapFramePoint(cam, frame, d.center),
        // t is [x, y, z] in meters from the camera; z is straight ahead.
        distance: d.pose ? Math.hypot(d.pose.t[0], d.pose.t[1], d.pose.t[2]) : null
      }));
    }
  } catch (error) {
    console.warn(error);
  }
  busy = false;
}

// Pose needs the camera's focal length and center in pixels of the scanned
// frame. Without a calibration, estimate the focal length from the field of view.
async function updateIntrinsics(frame) {
  const key = frame.width + 'x' + frame.height;
  if (key === intrinsicsFor) return;
  const fx = (frame.width / 2) / Math.tan(radians(CAMERA_FOV_DEGREES) / 2);
  await detector.set_camera_info(fx, fx, frame.width / 2, frame.height / 2);
  for (let id = 0; id < 16; id += 1) {
    await detector.set_tag_size(id, TAG_SIZE_METERS);
  }
  intrinsicsFor = key;
}

function drawTag(tag) {
  noFill();
  stroke(255, 210, 0);
  strokeWeight(3);
  beginShape();
  for (const c of tag.corners) vertex(c.x, c.y);
  endShape(CLOSE);

  // AprilTag lists corners counter-clockwise from the tag's bottom-left.
  noStroke();
  fill(255, 60, 60);
  circle(tag.corners[0].x, tag.corners[0].y, 10);

  fill(0, 180);
  const label = 'id ' + tag.id + (tag.distance ? ' · ' + round(tag.distance * 100) + ' cm' : '');
  textSize(16);
  rect(tag.center.x - textWidth(label) / 2 - 8, tag.center.y - 14, textWidth(label) + 16, 28, 6);
  fill(255);
  textAlign(CENTER, CENTER);
  text(label, tag.center.x, tag.center.y);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 52, width, 52);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  const message = !cam.ready ? 'Waiting for camera'
    : tags.length ? tags.length + ' tag' + (tags.length > 1 ? 's' : '') + ' · distance assumes ' + TAG_SIZE_METERS * 1000 + ' mm tags'
    : 'Show tag36h11 AprilTags (markers/print-apriltag.html)';
  text(message, 16, height - 26);
}

function mousePressed() {
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

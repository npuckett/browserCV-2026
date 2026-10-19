// ==============================================
// BRIGHTNESS TRACKING
// After Golan Levin's "Brightness Tracking" example for Processing's video library.
// ==============================================
// Finds the brightest spot in the camera image. Point a phone flashlight, a
// lamp or a lit screen at the camera and the sketch follows it.
//
// Two methods, side by side:
//   brightest  the single brightest pixel. Simple, but it jumps around.
//   centroid   the average position of every pixel above a threshold.
//              Steadier, and its area says how big the bright spot is.
//
// Key data:
//   brightest  { x, y, value } in canvas pixels, value 0..255
//   centroid   { x, y, area } in canvas pixels, area 0..1 of the frame, or null
//   threshold  0..255, the cutoff for the centroid method
// ==============================================

let cam;
let brightest = null;
let centroid = null;
let threshold = 230;

const SCAN_SIZE = 240;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });
}

function draw() {
  background(16, 19, 24);

  if (cam.ready) {
    drawPhoneCamera(cam);
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame) {
      findBrightness(frame);
      drawResults();
    }
  }

  drawPanel();
}

function findBrightness(frame) {
  const data = frame.imageData.data;
  let bestValue = -1;
  let bestX = 0;
  let bestY = 0;
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = 4 * (y * frame.width + x);
      // Perceived brightness: green counts most, blue least.
      const value = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];

      if (value > bestValue) {
        bestValue = value;
        bestX = x;
        bestY = y;
      }
      if (value >= threshold) {
        sumX += x;
        sumY += y;
        count += 1;
      }
    }
  }

  const bestPoint = mapFramePoint(cam, frame, { x: bestX, y: bestY });
  brightest = { x: bestPoint.x, y: bestPoint.y, value: bestValue };

  if (count > 0) {
    const center = mapFramePoint(cam, frame, { x: sumX / count, y: sumY / count });
    centroid = { x: center.x, y: center.y, area: count / (frame.width * frame.height) };
  } else {
    centroid = null;
  }
}

function drawResults() {
  // Brightest pixel: small crosshair
  stroke(255, 80, 80);
  strokeWeight(2);
  line(brightest.x - 14, brightest.y, brightest.x + 14, brightest.y);
  line(brightest.x, brightest.y - 14, brightest.x, brightest.y + 14);

  // Centroid: circle sized by the bright area
  if (centroid) {
    noFill();
    stroke(255, 220, 0);
    strokeWeight(4);
    circle(centroid.x, centroid.y, 30 + sqrt(centroid.area) * min(width, height));
  }
}

function drawPanel() {
  const panelHeight = 68;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);

  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Waiting for camera';
  if (cam.ready && brightest) {
    message = 'brightest ' + round(brightest.value) +
      (centroid ? ' · bright area ' + nf(centroid.area * 100, 1, 1) + '%' : ' · nothing above threshold');
  }
  text(message, 16, height - panelHeight / 2 - 10);
  fill(180);
  textSize(13);
  text('threshold ' + threshold + ' · drag up or down (or arrow keys) to change', 16, height - panelHeight / 2 + 12);
}

// Drag vertically anywhere to change the threshold. Works with mouse and touch.
function mouseDragged() {
  if (cameraSwitchJustPressed()) return false;
  threshold = constrain(threshold - (mouseY - pmouseY), 50, 255);
  return false;
}

function mousePressed() {
  return false;
}

function keyPressed() {
  if (keyIsDown(UP_ARROW)) threshold = constrain(threshold + 5, 50, 255);
  if (keyIsDown(DOWN_ARROW)) threshold = constrain(threshold - 5, 50, 255);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

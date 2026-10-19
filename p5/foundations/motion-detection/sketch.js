// ==============================================
// MOTION DETECTION (frame differencing)
// After Golan Levin's "Frame Differencing" example for Processing's video library.
// ==============================================
// Compares each camera frame with the one before it. Pixels that changed
// more than a threshold count as motion. The sketch shows those pixels, the
// center of the motion, and how much of the frame is moving.
//
// Keep the camera still: on a phone, prop it up. If the camera itself moves,
// every pixel changes.
//
// Key data:
//   motionAmount  0..1, the share of pixels that changed this frame
//   motionCenter  { x, y } in canvas pixels, or null when nothing moved
//   threshold     how much a pixel's brightness must change to count (0..255)
// ==============================================

let cam;
let previousFrame = null;
let motionAmount = 0;
let smoothedAmount = 0;
let motionCenter = null;
let motionMask = null;
let threshold = 40;

const SCAN_SIZE = 160;

function setup() {
  pixelDensity(1);
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  // The previous frame belongs to the old camera after a switch. Drop it.
  createCameraSwitch(cam, { onAfterSwitch: () => { previousFrame = null; } });
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });
}

function draw() {
  background(16, 19, 24);

  if (cam.ready) {
    drawPhoneCamera(cam);
    // The camera sends about 30 frames a second and draw() runs about 60
    // times, so only compare when a new frame has arrived. Comparing a frame
    // with itself would report zero motion every other draw().
    if (isNewFrame(cam)) {
      const frame = grabFrame(cam, SCAN_SIZE);
      if (frame) detectMotion(frame);
    }
    if (motionMask) drawOverCamera(cam, motionMask);
    drawMotionCenter();
  }

  drawMeter();
}

function detectMotion(frame) {
  const current = frame.imageData.data;

  // grabFrame() reuses one ImageData, so keep our own copy of this frame.
  if (!previousFrame || previousFrame.length !== current.length) {
    previousFrame = new Uint8ClampedArray(current);
    return;
  }

  if (!motionMask || motionMask.width !== frame.width || motionMask.height !== frame.height) {
    motionMask = createImage(frame.width, frame.height);
  }
  motionMask.loadPixels();

  let changed = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < frame.height; y += 1) {
    for (let x = 0; x < frame.width; x += 1) {
      const index = 4 * (y * frame.width + x);
      // Compare brightness, the average of red, green and blue.
      const now = (current[index] + current[index + 1] + current[index + 2]) / 3;
      const before = (previousFrame[index] + previousFrame[index + 1] + previousFrame[index + 2]) / 3;
      const moved = Math.abs(now - before) > threshold;

      motionMask.pixels[index] = 0;
      motionMask.pixels[index + 1] = 255;
      motionMask.pixels[index + 2] = 160;
      motionMask.pixels[index + 3] = moved ? 170 : 0;

      if (moved) {
        changed += 1;
        sumX += x;
        sumY += y;
      }
    }
  }
  motionMask.updatePixels();
  previousFrame.set(current);

  motionAmount = changed / (frame.width * frame.height);
  smoothedAmount = lerp(smoothedAmount, motionAmount, 0.2);
  motionCenter = changed > 20
    ? mapFramePoint(cam, frame, { x: sumX / changed, y: sumY / changed })
    : null;
}

function drawMotionCenter() {
  if (!motionCenter) return;
  noFill();
  stroke(255);
  strokeWeight(4);
  circle(motionCenter.x, motionCenter.y, 40);
}

function drawMeter() {
  const panelHeight = 68;
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - panelHeight, width, panelHeight);

  // Bar showing the smoothed amount of motion. 25% of the frame fills it.
  const barWidth = width - 32;
  fill(255, 40);
  rect(16, height - 24, barWidth, 8, 4);
  fill(0, 255, 160);
  rect(16, height - 24, barWidth * constrain(smoothedAmount * 4, 0, 1), 8, 4);

  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  const label = cam.ready
    ? 'motion ' + nf(motionAmount * 100, 1, 1) + '% · threshold ' + threshold + ' (drag up/down)'
    : 'Waiting for camera';
  text(label, 16, height - panelHeight + 20);
}

function mouseDragged() {
  if (cameraSwitchJustPressed()) return false;
  threshold = constrain(threshold - (mouseY - pmouseY), 5, 150);
  return false;
}

function mousePressed() {
  return false;
}

function keyPressed() {
  if (keyIsDown(UP_ARROW)) threshold = constrain(threshold + 5, 5, 150);
  if (keyIsDown(DOWN_ARROW)) threshold = constrain(threshold - 5, 5, 150);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

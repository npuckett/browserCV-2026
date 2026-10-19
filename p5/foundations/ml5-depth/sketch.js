// ==============================================
// ml5 DEPTH ESTIMATION — portrait depth
// ==============================================
// ml5's depthEstimation guesses how far each pixel is from the camera, using
// TensorFlow's ARPortraitDepth model. It was trained on portraits: one person,
// facing the camera, filling much of the frame. Rooms, objects and crowds
// give poor results (see p5/depth/ for a general-purpose model).
//
// ml5 also cuts the person out of the background with a second model and sets
// the background's depth to 0.
//
// Key data:
//   depthResult.image          p5.Image of the depth map (yellow near, purple far)
//   depthResult.getDepthAt(x, y)  depth at a video pixel: 0 (near) to 1 (far), 0 also = background
//   depthResult.width/height   size of the depth map (same as the video)
//   closest                    { x, y, depth } nearest point on the person, in canvas pixels
// ==============================================

let cam;
let depthModel;
let depthResult = null;
let closest = null;
let showDepth = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  // A portrait model, so default to the front camera on both desktop and phone.
  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam, {
    onBeforeSwitch: () => { if (depthModel) depthModel.estimateStop(); depthResult = null; },
    onAfterSwitch: () => { if (depthModel) depthModel.estimateStart(cam.videoElement, gotDepth); }
  });
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  setLoading('Waiting for camera');
  cam.onReady(() => {
    setLoading('Loading depth model');
    const options = {
      flipHorizontal: false,        // PhoneCamera handles the mirror when drawing
      colormap: 'color',
      normalizeDynamically: true,   // stretch each frame's range to use all the colors
      applySegmentationMask: true,  // set the background to 0
      targetFps: 15                 // depth is heavy; leave time for drawing
    };
    depthModel = ml5.depthEstimation(options, () => {
      depthModel.estimateStart(cam.videoElement, gotDepth);
      clearLoading();
    });
  });
}

function gotDepth(result) {
  if (!result) return;
  depthResult = result;
  closest = findClosest(result);
}

// Scan the depth map for the smallest non-zero value (zero is background).
function findClosest(result) {
  let best = null;
  const step = 4; // every 4th pixel is plenty for this
  for (let y = 0; y < result.height; y += step) {
    const row = result.data[y];
    for (let x = 0; x < result.width; x += step) {
      const depth = row[x];
      if (depth > 0 && (!best || depth < best.depth)) {
        best = { x: x, y: y, depth: depth };
      }
    }
  }
  if (!best) return null;
  // The depth map has the video's size, so map it like any video point.
  const point = cam.mapPoint(best.x * cam.videoElement.videoWidth / result.width,
                             best.y * cam.videoElement.videoHeight / result.height);
  return { x: point.x, y: point.y, depth: best.depth };
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  if (depthResult && showDepth) {
    drawOverCamera(cam, depthResult.image);
  }

  if (closest) {
    noFill();
    stroke(255);
    strokeWeight(3);
    circle(closest.x, closest.y, 34);
    noStroke();
    fill(255);
    textAlign(CENTER, BOTTOM);
    textSize(13);
    text('closest', closest.x, closest.y - 20);
  }

  drawProbe();
  drawPanel();
  drawStatus();
}

// Show the depth under the mouse, or under a finger while it is down.
function drawProbe() {
  if (!depthResult) return;
  const isPointing = window.isMobile ? touches.length > 0 : true;
  if (!isPointing) return;

  const video = canvasToVideo(cam, mouseX, mouseY);
  if (!video.inside) return;
  const depth = depthResult.getDepthAt(
    video.x * depthResult.width / cam.videoElement.videoWidth,
    video.y * depthResult.height / cam.videoElement.videoHeight
  );
  if (depth === null) return;

  stroke(255);
  strokeWeight(2);
  line(mouseX - 10, mouseY, mouseX + 10, mouseY);
  line(mouseX, mouseY - 10, mouseX, mouseY + 10);
  noStroke();
  fill(255);
  textAlign(LEFT, BOTTOM);
  textSize(14);
  text(depth === 0 ? 'background' : 'depth ' + nf(depth, 1, 2), mouseX + 12, mouseY - 6);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - 52, width, 52);
  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Face the camera, one person in view';
  if (!cam.ready) message = 'Waiting for camera';
  else if (depthResult) message = (window.isMobile ? 'Touch' : 'Hover') + ' to read depth · tap to ' + (showDepth ? 'hide' : 'show') + ' depth map';
  text(message, 16, height - 26);
}

// A quick tap toggles the depth map. Holding a finger down reads depth instead.
let pressStart = 0;

function mousePressed() {
  pressStart = millis();
  return false;
}

function mouseReleased() {
  if (cameraSwitchJustPressed()) return false;
  if (depthResult && millis() - pressStart < 250) showDepth = !showDepth;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

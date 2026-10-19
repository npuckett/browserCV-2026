// ==============================================
// MEDIAPIPE INTERACTIVE SEGMENTER — tap an object, get its outline
// ==============================================
// Tap any object and MediaPipe's InteractiveSegmenter cuts it out. It isn't
// limited to a list of classes: it segments whatever is under your finger.
//
// The segmenter works on still images, not live video, so a tap freezes the
// current frame. setImage() runs the heavy part once per frozen frame; after
// that each segment() call is quick, so you can refine the selection:
//   + mode   taps add to the selection
//   − mode   taps remove from it
//   Live     return to the camera
//
// MediaPipe is loaded the way Golan Levin's p5 sketches load it: a dynamic
// import() from a global-mode sketch (https://editor.p5js.org/golan/sketches/0XkgzZGe8).
//
// Key data:
//   strokes        [{ brushMode: 1 (add) | 2 (remove), point: [{ x, y }], isCompleted }]
//                  with x and y from 0 to 1 across the frozen frame
//   maskValues     Float32Array, one 0..1 confidence per pixel of the frame
//   selection      { area (0..1 of the frame), box: { x, y, w, h } in canvas pixels }
// ==============================================

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/interactive_segmenter_v2/magic_touch/int8/1/interactive_segmentation.task';
// BrushMode isn't exported as a value by the bundle, so use its numbers.
const ADD = 1;
const REMOVE = 2;

let cam;
let segmenter = null;
let frozen = null;      // p5.Graphics holding the frozen frame (not mirrored)
let strokes = [];
let maskValues = null;
let overlay = null;     // p5.Image: tint on the selection, dark elsewhere
let selection = null;
let brush = ADD;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam, { onBeforeSwitch: goLive });
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  loadSegmenter();
}

async function loadSegmenter() {
  try {
    setLoading('Loading MediaPipe');
    const { InteractiveSegmenter, FilesetResolver } = await import(MP_URL + '/vision_bundle.mjs');
    const vision = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');
    setLoading('Downloading model (30 MB)');
    // This model runs faster on the CPU than on the GPU delegate.
    segmenter = await InteractiveSegmenter.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' }
    });
    clearLoading();
  } catch (error) {
    setError('Could not load MediaPipe: ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  if (frozen) {
    drawOverCamera(cam, frozen);
    if (overlay) drawOverCamera(cam, overlay);
    drawStrokePoints();
  } else {
    drawPhoneCamera(cam);
  }
  drawPanel();
  drawStatus();
}

// ----------------------------------------------
// Freezing a frame and segmenting it
// ----------------------------------------------
function freezeFrame() {
  const video = cam.videoElement;
  frozen = createGraphics(video.videoWidth, video.videoHeight);
  frozen.pixelDensity(1);
  frozen.drawingContext.drawImage(video, 0, 0);
  strokes = [];
  // The heavy encoder step, once per frozen frame.
  segmenter.setImage(frozen.elt);
}

function addPoint(canvasX, canvasY) {
  const videoPoint = canvasToVideo(cam, canvasX, canvasY);
  if (!videoPoint.inside) return;
  strokes.push({
    brushMode: brush,
    point: [{ x: videoPoint.x / frozen.width, y: videoPoint.y / frozen.height }],
    isCompleted: true
  });
  runSegmentation();
}

function runSegmentation() {
  const mask = segmenter.segment(strokes);
  maskValues = mask.getAsFloat32Array();
  buildOverlay(mask.width, mask.height);
  mask.close(); // masks hold memory in the wasm heap until closed
}

// Selected pixels get a yellow tint, the rest is darkened. Also measure the
// selection's area and bounding box.
function buildOverlay(maskWidth, maskHeight) {
  if (!overlay || overlay.width !== maskWidth || overlay.height !== maskHeight) {
    overlay = createImage(maskWidth, maskHeight);
  }
  overlay.loadPixels();
  let count = 0;
  let minX = maskWidth, minY = maskHeight, maxX = 0, maxY = 0;
  for (let y = 0; y < maskHeight; y += 1) {
    for (let x = 0; x < maskWidth; x += 1) {
      const i = y * maskWidth + x;
      const selected = maskValues[i] > 0.5;
      overlay.pixels[i * 4] = selected ? 255 : 0;
      overlay.pixels[i * 4 + 1] = selected ? 210 : 0;
      overlay.pixels[i * 4 + 2] = 0;
      overlay.pixels[i * 4 + 3] = selected ? 80 : 170;
      if (selected) {
        count += 1;
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
  }
  overlay.updatePixels();

  if (count === 0) {
    selection = null;
    return;
  }
  // Mask pixels -> video pixels -> canvas pixels
  const scaleX = frozen.width / maskWidth;
  const scaleY = frozen.height / maskHeight;
  const cornerA = cam.mapPoint(minX * scaleX, minY * scaleY);
  const cornerB = cam.mapPoint(maxX * scaleX, maxY * scaleY);
  selection = {
    area: count / (maskWidth * maskHeight),
    box: {
      x: Math.min(cornerA.x, cornerB.x),
      y: Math.min(cornerA.y, cornerB.y),
      w: Math.abs(cornerB.x - cornerA.x),
      h: Math.abs(cornerB.y - cornerA.y)
    }
  };
}

function goLive() {
  frozen = null;
  overlay = null;
  strokes = [];
  selection = null;
}

// ----------------------------------------------
// Drawing and controls
// ----------------------------------------------
function drawStrokePoints() {
  for (const entry of strokes) {
    const p = cam.mapPoint(entry.point[0].x * frozen.width, entry.point[0].y * frozen.height);
    fill(entry.brushMode === ADD ? '#7dff6a' : '#ff4f7b');
    stroke(0);
    strokeWeight(2);
    circle(p.x, p.y, 16);
  }
  if (selection) {
    noFill();
    stroke('#ffd200');
    strokeWeight(2);
    rect(selection.box.x, selection.box.y, selection.box.w, selection.box.h);
  }
}

function buttons() {
  const size = 48;
  const y = height - size - 8;
  return {
    live: { x: width - 3 * (size + 8), y: y, w: size, h: size, label: 'Live' },
    add: { x: width - 2 * (size + 8), y: y, w: size, h: size, label: '+' },
    remove: { x: width - (size + 8), y: y, w: size, h: size, label: '−' }
  };
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 64, width, 64);

  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  let message = 'Tap an object to cut it out';
  if (!cam.ready) message = 'Waiting for camera';
  else if (selection) message = 'selected ' + nf(selection.area * 100, 1, 1) + '% of the frame';
  else if (frozen) message = 'Nothing selected. Tap the object.';
  text(message, 16, height - 32);

  if (!frozen) return;
  const b = buttons();
  for (const [name, button] of Object.entries(b)) {
    const active = (name === 'add' && brush === ADD) || (name === 'remove' && brush === REMOVE);
    fill(active ? '#ffd200' : 255);
    rect(button.x, button.y, button.w, button.h, 8);
    fill(17);
    textAlign(CENTER, CENTER);
    textSize(name === 'live' ? 14 : 24);
    text(button.label, button.x + button.w / 2, button.y + button.h / 2);
  }
}

function hitButton(x, y) {
  if (!frozen) return null;
  for (const [name, b] of Object.entries(buttons())) {
    if (x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h) return name;
  }
  return null;
}

function mousePressed() {
  if (cameraSwitchJustPressed() || !cam.ready || !segmenter || isLoading()) return false;

  const button = hitButton(mouseX, mouseY);
  if (button === 'live') goLive();
  else if (button === 'add') brush = ADD;
  else if (button === 'remove') brush = REMOVE;
  else if (mouseY < height - 64) {
    const x = mouseX;
    const y = mouseY;
    if (!frozen) {
      // Show a spinner for one frame, then do the slow encoder step.
      setLoading('Analyzing frame');
      setTimeout(() => {
        freezeFrame();
        brush = ADD;
        addPoint(x, y);
        clearLoading();
      }, 30);
    } else {
      addPoint(x, y);
    }
  }
  return false;
}

function keyPressed() {
  if (key === 'l' || keyCode === ESCAPE) goLive();
  if (key === '+' || key === '=') brush = ADD;
  if (key === '-') brush = REMOVE;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

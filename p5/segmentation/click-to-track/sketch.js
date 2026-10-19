// ==============================================
// CLICK TO TRACK — EdgeTAM segmentation, re-prompted every frame
// ==============================================
// Tap an object. EdgeTAM (a small, fast version of Meta's SAM 2) cuts it out,
// and the sketch keeps following it: every new frame is segmented again,
// prompted with the center and bounding box of the previous frame's mask.
//
// Why "re-prompted"? SAM 2 and EdgeTAM can track with a memory of past frames,
// but Transformers.js (4.3) only exposes single-image segmentation. Feeding
// each frame the last result is a simple stand-in. It follows slow, distinct
// objects well and loses fast or look-alike ones. Tap again to re-select.
//
// Key data:
//   prompt       { point: { x, y }, box: [x1, y1, x2, y2] | null } in frame pixels
//   track        { mask (Uint8Array, 1 = object), center, box, score, area } or null
//   score        the model's own estimate of mask quality (iou_scores), 0..1
// ==============================================

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';
const MODEL_ID = 'onnx-community/EdgeTAM-ONNX';
const FRAME_SIZE = 640;   // longest side of the frame given to the model
const LOST_SCORE = 0.3;   // below this score (or an empty mask) the object counts as lost

let T;                    // the Transformers.js module
let edgeTam = null;
let processor = null;
let device = '';
let dtype = '';

let cam;
let frameCanvas;          // the frame being segmented (not mirrored)
let prompt = null;
let track = null;
let overlay = null;
let busy = false;
let lastMs = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam, { onBeforeSwitch: stopTracking });
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  loadEdgeTam();
}

async function loadEdgeTam() {
  try {
    setLoading('Loading Transformers.js');
    T = await import(TRANSFORMERS_URL);
    const adapter = navigator.gpu ? await navigator.gpu.requestAdapter() : null;
    if (adapter) {
      device = 'webgpu';
      dtype = adapter.features.has('shader-f16') ? 'fp16' : 'fp32';
    } else {
      device = 'wasm';
      dtype = 'q8';
    }
    setLoading('Downloading EdgeTAM (' + dtype + ')');
    edgeTam = await T.EdgeTamModel.from_pretrained(MODEL_ID, { device: device, dtype: dtype });
    processor = await T.AutoProcessor.from_pretrained(MODEL_ID);
    clearLoading();
  } catch (error) {
    setError('Could not load EdgeTAM: ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  if (edgeTam && prompt && cam.ready && !busy && isNewFrame(cam)) {
    segmentFrame();
  }

  if (track && overlay) {
    drawOverCamera(cam, overlay);
    drawTrackMarker();
  }
  drawPanel();
  drawStatus();
}

// ----------------------------------------------
// Segment the current frame from the current prompt
// ----------------------------------------------
async function segmentFrame() {
  busy = true;
  const started = performance.now();
  const video = cam.videoElement;
  const scale = Math.min(1, FRAME_SIZE / Math.max(video.videoWidth, video.videoHeight));
  const w = round(video.videoWidth * scale);
  const h = round(video.videoHeight * scale);
  if (!frameCanvas || frameCanvas.width !== w || frameCanvas.height !== h) {
    frameCanvas = createGraphics(w, h);
    frameCanvas.pixelDensity(1);
  }
  frameCanvas.drawingContext.drawImage(video, 0, 0, w, h);

  try {
    const image = await T.RawImage.fromCanvas(frameCanvas.elt);
    // Prompts are nested arrays: [image][object][point] = [x, y].
    const promptOptions = {
      input_points: [[[[prompt.point.x, prompt.point.y]]]],
      input_labels: [[[1]]]   // 1 = this point is on the object
    };
    if (prompt.box) promptOptions.input_boxes = [[prompt.box]];

    const inputs = await processor(image, promptOptions);
    const outputs = await edgeTam(inputs);
    // Upscale the 256 × 256 masks back to the frame size.
    const masks = await processor.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
    if (prompt) useResult(masks[0], Array.from(outputs.iou_scores.data), w, h);
  } catch (error) {
    console.warn(error);
  }
  lastMs = performance.now() - started;
  busy = false;
}

// EdgeTAM returns three candidate masks. Keep the one it scores highest,
// measure it, and turn it into the prompt for the next frame.
function useResult(maskTensor, scores, w, h) {
  const best = scores.indexOf(Math.max(...scores));
  const plane = w * h;
  const data = maskTensor.data;
  const mask = new Uint8Array(plane);
  let count = 0, sumX = 0, sumY = 0;
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (let i = 0; i < plane; i += 1) {
    if (data[best * plane + i]) {
      mask[i] = 1;
      const x = i % w;
      const y = (i / w) | 0;
      count += 1; sumX += x; sumY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (count === 0 || scores[best] < LOST_SCORE) {
    track = null;
    prompt = null;
    return;
  }

  const center = { x: sumX / count, y: sumY / count };
  // How far the object moved since the last frame (zero on the first frame).
  const velocity = track ? { x: center.x - track.center.x, y: center.y - track.center.y } : { x: 0, y: 0 };
  track = { mask: mask, center: center, box: [minX, minY, maxX, maxY], score: scores[best], area: count / plane, width: w, height: h };
  updateOverlay();

  // Next frame's prompt: assume the object keeps moving the same way, so shift
  // the center and the box by the last movement, and grow the box by 30% to
  // allow for changes in speed.
  const growX = (maxX - minX) * 0.3 + Math.abs(velocity.x);
  const growY = (maxY - minY) * 0.3 + Math.abs(velocity.y);
  prompt = {
    point: { x: constrain(center.x + velocity.x, 0, w - 1), y: constrain(center.y + velocity.y, 0, h - 1) },
    box: [
      max(0, minX + velocity.x - growX), max(0, minY + velocity.y - growY),
      min(w, maxX + velocity.x + growX), min(h, maxY + velocity.y + growY)
    ]
  };
}

function updateOverlay() {
  if (!overlay || overlay.width !== track.width || overlay.height !== track.height) {
    overlay = createImage(track.width, track.height);
  }
  overlay.loadPixels();
  for (let i = 0; i < track.mask.length; i += 1) {
    const on = track.mask[i] === 1;
    overlay.pixels[i * 4] = 0;
    overlay.pixels[i * 4 + 1] = 230;
    overlay.pixels[i * 4 + 2] = 255;
    overlay.pixels[i * 4 + 3] = on ? 120 : 0;
  }
  overlay.updatePixels();
}

function drawTrackMarker() {
  const video = cam.videoElement;
  const toVideo = video.videoWidth / track.width;
  const center = cam.mapPoint(track.center.x * toVideo, track.center.y * toVideo);
  noFill();
  stroke(255);
  strokeWeight(3);
  circle(center.x, center.y, 30);
  line(center.x - 22, center.y, center.x + 22, center.y);
  line(center.x, center.y - 22, center.x, center.y + 22);
}

function stopTracking() {
  prompt = null;
  track = null;
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 52, width, 52);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  let message = 'Tap an object to track it';
  if (!cam.ready) message = 'Waiting for camera';
  else if (track) message = 'tracking · score ' + nf(track.score, 1, 2) + ' · ' + round(lastMs) + ' ms/frame · ' + device + ' ' + dtype;
  else if (prompt) message = 'Segmenting…';
  text(message, 16, height - 26);
}

// A tap starts tracking whatever is under it.
function mousePressed() {
  if (cameraSwitchJustPressed() || !cam.ready || !edgeTam) return false;
  const videoPoint = canvasToVideo(cam, mouseX, mouseY);
  if (!videoPoint.inside) return false;
  const video = cam.videoElement;
  const scale = Math.min(1, FRAME_SIZE / Math.max(video.videoWidth, video.videoHeight));
  prompt = { point: { x: videoPoint.x * scale, y: videoPoint.y * scale }, box: null };
  track = null;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

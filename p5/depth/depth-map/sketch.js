// ==============================================
// DEPTH MAP — Depth Anything V2 with Transformers.js
// ==============================================
// Depth Anything V2 (small) guesses how far every pixel is from the camera,
// for any scene: rooms, objects, streets, people. It runs in the browser with
// Transformers.js, on WebGPU when available.
//
// Tap to switch views:
//   map   the depth map over the camera image (bright = near)
//   3d    a p5 WEBGL mesh pushed toward you by depth, textured with the frame
//
// Key data:
//   depthImage       RawImage from the pipeline: { width, height, data }
//                    data is one byte per pixel, 0 (far) to 255 (near)
//   depthAt(x, y)    0..1 nearness at a point of the depth image
//   device, dtype    what Transformers.js is running on
// ==============================================

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';
const MODEL_ID = 'onnx-community/depth-anything-v2-small';
// Size of the frame sent to the model. Smaller is faster; the model's own
// processor resizes it again, keeping multiples of 14.
const INPUT_SIZE = window.isMobile ? 256 : 384;
const GRID = window.isMobile ? 40 : 56; // mesh columns in the 3d view (about 9 ms per frame at 56 on a laptop)
const DEPTH_SCALE = 0.3;  // how far the nearest pixel comes out, relative to mesh width

let cam;
let estimator = null;
let device = '';
let dtype = '';
let busy = false;
let view = 'map';

let inputFrame;     // p5.Graphics sent to the model
let shownFrame;     // copy of the frame that matches the current depth (3d texture)
let depthImage = null;
let depthOverlay = null;
let mesh3d;         // WEBGL layer for the 3d view

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  mesh3d = createGraphics(width, height, WEBGL);
  loadEstimator();
}

async function loadEstimator() {
  try {
    setLoading('Loading Transformers.js');
    const { pipeline } = await import(TRANSFORMERS_URL);

    // WebGPU if the browser has it. fp16 halves the download but needs the
    // GPU's shader-f16 feature; without WebGPU, run a smaller 8-bit model on the CPU.
    const adapter = navigator.gpu ? await navigator.gpu.requestAdapter() : null;
    if (adapter) {
      device = 'webgpu';
      dtype = adapter.features.has('shader-f16') ? 'fp16' : 'fp32';
    } else {
      device = 'wasm';
      dtype = 'q8';
    }

    estimator = await pipeline('depth-estimation', MODEL_ID, {
      device: device,
      dtype: dtype,
      progress_callback: showProgress
    });
    clearLoading();
  } catch (error) {
    setError('Could not load the depth model: ' + error.message);
  }
}

// Transformers.js reports each file's download progress (0-100).
function showProgress(info) {
  if (info.status === 'progress' && info.file && info.file.endsWith('.onnx')) {
    setLoading('Downloading depth model (' + dtype + ')', info.progress / 100);
  } else if (info.status === 'ready') {
    setLoading('Starting the model');
  }
}

function draw() {
  background(16, 19, 24);

  if (estimator && cam.ready && !busy && isNewFrame(cam)) {
    estimateDepth();
  }

  if (view === 'map') {
    drawPhoneCamera(cam);
    if (depthOverlay) drawOverCamera(cam, depthOverlay);
  } else {
    drawMesh();
  }

  drawPanel();
  drawStatus();
}

async function estimateDepth() {
  busy = true;
  const video = cam.videoElement;
  const scale = INPUT_SIZE / Math.max(video.videoWidth, video.videoHeight);
  const w = round(video.videoWidth * scale);
  const h = round(video.videoHeight * scale);
  if (!inputFrame || inputFrame.width !== w || inputFrame.height !== h) {
    inputFrame = createGraphics(w, h);
    inputFrame.pixelDensity(1);
    shownFrame = createGraphics(w, h);
    shownFrame.pixelDensity(1);
  }
  inputFrame.drawingContext.drawImage(video, 0, 0, w, h);

  try {
    // The pipeline takes a canvas and returns { depth, predicted_depth }.
    const output = await estimator(inputFrame.elt);
    depthImage = output.depth;
    shownFrame.drawingContext.drawImage(inputFrame.elt, 0, 0);
    updateOverlay();
  } catch (error) {
    console.warn(error);
  }
  busy = false;
}

// One byte per pixel -> an RGBA p5.Image: near is bright and opaque.
function updateOverlay() {
  if (!depthOverlay || depthOverlay.width !== depthImage.width || depthOverlay.height !== depthImage.height) {
    depthOverlay = createImage(depthImage.width, depthImage.height);
  }
  depthOverlay.loadPixels();
  for (let i = 0; i < depthImage.data.length; i += 1) {
    const value = depthImage.data[i];
    depthOverlay.pixels[i * 4] = value;
    depthOverlay.pixels[i * 4 + 1] = value;
    depthOverlay.pixels[i * 4 + 2] = value;
    depthOverlay.pixels[i * 4 + 3] = 235;
  }
  depthOverlay.updatePixels();
}

// Nearness (0 far .. 1 near) at a point of the depth image.
function depthAt(x, y) {
  const xi = constrain(floor(x), 0, depthImage.width - 1);
  const yi = constrain(floor(y), 0, depthImage.height - 1);
  return depthImage.data[yi * depthImage.width + xi] / 255;
}

// The 3d view: a grid of vertices, each pushed toward the viewer by its depth.
function drawMesh() {
  mesh3d.clear();
  if (!depthImage || !shownFrame) return;

  const meshWidth = min(width, height * 4 / 3) * 0.65;
  const meshHeight = meshWidth * depthImage.height / depthImage.width;
  const rows = round(GRID * depthImage.height / depthImage.width);
  const flip = cam.mirror ? -1 : 1; // match the mirrored camera view

  mesh3d.push();
  // Sway slowly, plus follow the mouse or finger, so the depth is visible.
  mesh3d.rotateY(sin(millis() / 2000) * 0.35 + (mouseX / width - 0.5) * 0.8);
  mesh3d.rotateX((mouseY / height - 0.5) * -0.6);
  mesh3d.noStroke();
  mesh3d.textureMode(NORMAL);
  mesh3d.texture(shownFrame);

  for (let row = 0; row < rows; row += 1) {
    mesh3d.beginShape(TRIANGLE_STRIP);
    for (let col = 0; col <= GRID; col += 1) {
      for (const r of [row, row + 1]) {
        const u = col / GRID;
        const v = r / rows;
        const z = depthAt(u * depthImage.width, v * depthImage.height) * meshWidth * DEPTH_SCALE;
        mesh3d.vertex(flip * (u - 0.5) * meshWidth, (v - 0.5) * meshHeight, z, u, v);
      }
    }
    mesh3d.endShape();
  }
  mesh3d.pop();
  image(mesh3d, 0, 0);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 220);
  rect(0, height - 52, width, 52);
  fill(247);
  textAlign(LEFT, CENTER);
  textSize(15);
  let message = 'Waiting for camera';
  if (cam.ready && depthImage) {
    const center = depthAt(depthImage.width / 2, depthImage.height / 2);
    message = view + ' view · tap to switch · center ' + nf(center, 1, 2) + ' · ' + device + ' ' + dtype;
  } else if (cam.ready) {
    message = 'Loading…';
  }
  text(message, 16, height - 26);
}

function mousePressed() {
  if (cameraSwitchJustPressed() || !cam.ready) return false;
  view = view === 'map' ? '3d' : 'map';
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  mesh3d = createGraphics(max(1, width), max(1, height), WEBGL);
}

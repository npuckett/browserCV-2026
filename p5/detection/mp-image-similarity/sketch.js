// ==============================================
// MEDIAPIPE IMAGE SIMILARITY — "which one is this?"
// ==============================================
// MediaPipe's ImageEmbedder turns an image into an embedding: a list of
// numbers that describes what the image looks like. Two similar images have
// similar embeddings. Save up to three reference views, then point the
// camera around: the sketch scores the live view against each reference.
//
// No training needed. Save a view of a mug, a plant and a book, and the
// sketch tells you which one the camera is looking at.
//
// MediaPipe is loaded the way Golan Levin's p5 sketches load it: a dynamic
// import() from a global-mode sketch (https://editor.p5js.org/golan/sketches/0XkgzZGe8).
//
// Key data:
//   liveEmbedding        result.embeddings[0] for the current frame
//                        ({ floatEmbedding: number[], headIndex, headName })
//   slots                [{ thumbnail, embedding } or null] × 3
//   similarities         cosine similarity of the live view to each slot,
//                        about 0 (unrelated) to 1 (identical)
//   bestSlot             index of the most similar slot above MATCH_THRESHOLD, or -1
// ==============================================

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite';
const MATCH_THRESHOLD = 0.6;
const SLOT_COUNT = 3;

let cam;
let ImageEmbedder = null; // the class, for its static cosineSimilarity()
let embedder = null;
let liveEmbedding = null;
let slots = [null, null, null];
let similarities = [0, 0, 0];
let bestSlot = -1;
let lastTimestamp = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  const startCamera = window.isMobile ? 'environment' : 'user';
  cam = createPhoneCamera(startCamera, startCamera === 'user', 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  loadEmbedder();
}

async function loadEmbedder() {
  try {
    setLoading('Loading MediaPipe');
    const vision = await import(MP_URL + '/vision_bundle.mjs');
    ImageEmbedder = vision.ImageEmbedder;
    const fileset = await vision.FilesetResolver.forVisionTasks(MP_URL + '/wasm');

    setLoading('Downloading model (4 MB)');
    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      l2Normalize: true
    };
    try {
      embedder = await ImageEmbedder.createFromOptions(fileset, options);
    } catch (gpuError) {
      options.baseOptions.delegate = 'CPU';
      embedder = await ImageEmbedder.createFromOptions(fileset, options);
    }
    clearLoading();
  } catch (error) {
    setError('Could not load MediaPipe: ' + error.message);
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  const video = cam.videoElement;
  if (embedder && isNewFrame(cam) && video.videoWidth > 0) {
    lastTimestamp = Math.max(performance.now(), lastTimestamp + 1);
    liveEmbedding = embedder.embedForVideo(video, lastTimestamp).embeddings[0];
    compareWithSlots();
  }

  drawSlots();
  drawStatus();
}

function compareWithSlots() {
  bestSlot = -1;
  let bestScore = MATCH_THRESHOLD;
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    if (!slots[i]) {
      similarities[i] = 0;
      continue;
    }
    // cosineSimilarity takes the embedding objects, not the number arrays.
    similarities[i] = ImageEmbedder.cosineSimilarity(liveEmbedding, slots[i].embedding);
    if (similarities[i] > bestScore) {
      bestScore = similarities[i];
      bestSlot = i;
    }
  }
}

// Save the current view (its embedding and a thumbnail) into a slot.
function saveSlot(index) {
  if (!liveEmbedding || !cam.ready) return;
  const video = cam.videoElement;
  const thumbnail = createGraphics(160, round(160 * video.videoHeight / video.videoWidth));
  if (cam.mirror) {
    thumbnail.translate(thumbnail.width, 0);
    thumbnail.scale(-1, 1);
  }
  thumbnail.drawingContext.drawImage(video, 0, 0, thumbnail.width, thumbnail.height);
  slots[index] = { thumbnail: thumbnail, embedding: liveEmbedding };
}

// Three slots along the bottom: thumbnail, similarity bar, label.
function slotRects() {
  const gap = 10;
  const size = min((width - gap * (SLOT_COUNT + 1)) / SLOT_COUNT, 170);
  const total = size * SLOT_COUNT + gap * (SLOT_COUNT - 1);
  const startX = (width - total) / 2;
  const y = height - size - 30;
  return Array.from({ length: SLOT_COUNT }, (_, i) => ({ x: startX + i * (size + gap), y: y, size: size }));
}

function drawSlots() {
  const rects = slotRects();
  textAlign(CENTER, CENTER);
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    const r = rects[i];
    const isBest = i === bestSlot;

    noStroke();
    fill(10, 13, 18, 220);
    rect(r.x, r.y, r.size, r.size + 22, 8);

    if (slots[i]) {
      const thumb = slots[i].thumbnail;
      const h = r.size * thumb.height / thumb.width;
      image(thumb, r.x, r.y + (r.size - h) / 2, r.size, h);
      // Similarity bar
      fill(255, 50);
      rect(r.x + 6, r.y + r.size + 6, r.size - 12, 10, 5);
      fill(isBest ? '#ffd200' : 'rgba(255,255,255,0.8)');
      rect(r.x + 6, r.y + r.size + 6, (r.size - 12) * constrain(similarities[i], 0, 1), 10, 5);
      fill(255);
      textSize(14);
      text(nf(similarities[i], 1, 2), r.x + r.size / 2, r.y + 16);
    } else {
      fill(200);
      textSize(14);
      text('tap to save\nthis view', r.x + r.size / 2, r.y + r.size / 2);
    }

    noFill();
    stroke(isBest ? '#ffd200' : color(255, 60));
    strokeWeight(isBest ? 5 : 1);
    rect(r.x, r.y, r.size, r.size + 22, 8);
  }

  noStroke();
  fill(247);
  textSize(15);
  const anySaved = slots.some((slot) => slot);
  const message = !cam.ready ? 'Waiting for camera'
    : !anySaved ? 'Point at something and tap a slot (or press 1, 2, 3)'
    : bestSlot >= 0 ? 'Looks like slot ' + (bestSlot + 1)
    : 'No close match';
  text(message, width / 2, rects[0].y - 20);
}

function mousePressed() {
  if (cameraSwitchJustPressed() || !cam.ready) return false;
  const rects = slotRects();
  for (let i = 0; i < SLOT_COUNT; i += 1) {
    const r = rects[i];
    if (mouseX > r.x && mouseX < r.x + r.size && mouseY > r.y && mouseY < r.y + r.size + 22) {
      saveSlot(i);
    }
  }
  return false;
}

function keyPressed() {
  if (key === '1' || key === '2' || key === '3') saveSlot(int(key) - 1);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

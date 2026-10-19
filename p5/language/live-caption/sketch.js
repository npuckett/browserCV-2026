// ==============================================
// LIVE CAPTION — a vision-language model describes the camera
// ==============================================
// FastVLM (0.5B, from Apple) looks at the camera image and writes about it,
// running entirely in the browser with Transformers.js and WebGPU. Each
// caption takes a second or more, so this suits slow, descriptive pieces,
// not tracking. Words appear as the model writes them.
//
// The model is a large download (about 770 MB, cached afterwards), so it only
// starts after you tap to confirm. Tap again later to change the question.
//
// Key data:
//   caption        the text being written now (grows token by token)
//   lastCaption    the last finished caption (shown large)
//   secondsPerCaption   how long the last caption took
//   PROMPTS        the questions the sketch cycles through
// ==============================================

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';
const MODEL_ID = 'onnx-community/FastVLM-0.5B-ONNX';
const FRAME_SIZE = 768;      // longest side of the frame sent to the model
const MAX_NEW_TOKENS = 60;   // caps the caption length (and time)
const PAUSE_MS = 1500;       // rest between captions, for a calmer pace

const PROMPTS = [
  'Describe what you see in one sentence.',
  'What is the person or main object doing? Answer in one short sentence.',
  'List the colors you can see.',
  'Write a two-line poem about this scene.'
];

let T;
let processor = null;
let vlm = null;
let state = 'waiting';   // waiting → confirm → loading → ready (or unsupported)
let busy = false;
let promptIndex = 0;
let caption = '';
let lastCaption = '';
let secondsPerCaption = 0;
let nextCaptionAt = 0;
let cam;
let frameCanvas;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  checkSupport();
}

// FastVLM's 16-bit weights need WebGPU with shader-f16.
async function checkSupport() {
  const adapter = navigator.gpu ? await navigator.gpu.requestAdapter() : null;
  if (!adapter || !adapter.features.has('shader-f16')) {
    state = 'unsupported';
    setError('This example needs WebGPU with 16-bit float support: desktop Chrome or Edge, or a recent phone. ' +
      'Try ask-the-camera or the smaller examples instead.');
    return;
  }
  state = 'confirm';
}

async function loadVlm() {
  state = 'loading';
  try {
    setLoading('Loading Transformers.js');
    T = await import(TRANSFORMERS_URL);
    processor = await T.AutoProcessor.from_pretrained(MODEL_ID);
    // Three parts of the model, each with its own precision.
    vlm = await T.AutoModelForImageTextToText.from_pretrained(MODEL_ID, {
      device: 'webgpu',
      dtype: { embed_tokens: 'fp16', vision_encoder: 'fp16', decoder_model_merged: 'q4f16' },
      progress_callback: showProgress
    });
    clearLoading();
    state = 'ready';
  } catch (error) {
    setError('Could not load FastVLM: ' + error.message);
  }
}

// Sum the progress of the big files into one bar.
const downloads = {};
function showProgress(info) {
  if (info.status === 'progress' && info.file && info.file.endsWith('.onnx')) {
    downloads[info.file] = { loaded: info.loaded, total: info.total };
    const files = Object.values(downloads);
    const loaded = files.reduce((sum, f) => sum + f.loaded, 0);
    const total = files.reduce((sum, f) => sum + f.total, 0);
    setLoading('Downloading FastVLM · ' + round(loaded / 1048576) + ' MB', loaded / max(total, 1));
  }
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);

  if (state === 'ready' && cam.ready && !busy && millis() > nextCaptionAt) {
    writeCaption();
  }

  drawCaption();
  if (state === 'confirm' && cam.ready) drawConfirm();
  drawStatus();
}

async function writeCaption() {
  busy = true;
  const started = performance.now();
  try {
    // Copy the current frame (not mirrored) and wrap its pixels as a RawImage.
    const video = cam.videoElement;
    const scale = Math.min(1, FRAME_SIZE / Math.max(video.videoWidth, video.videoHeight));
    const w = round(video.videoWidth * scale);
    const h = round(video.videoHeight * scale);
    if (!frameCanvas || frameCanvas.width !== w || frameCanvas.height !== h) {
      frameCanvas = createGraphics(w, h);
      frameCanvas.pixelDensity(1);
    }
    frameCanvas.drawingContext.drawImage(video, 0, 0, w, h);
    const image = await T.RawImage.fromCanvas(frameCanvas.elt);

    // FastVLM's chat format: the <image> tag marks where the picture goes.
    const messages = [
      { role: 'system', content: 'You are a helpful visual assistant. Answer briefly.' },
      { role: 'user', content: '<image>' + PROMPTS[promptIndex] }
    ];
    const chat = processor.apply_chat_template(messages, { add_generation_prompt: true });
    const inputs = await processor(image, chat, { add_special_tokens: false });

    // The streamer hands over text as soon as each token is decoded.
    caption = '';
    const streamer = new T.TextStreamer(processor.tokenizer, {
      skip_prompt: true,
      skip_special_tokens: true,
      callback_function: (text) => { caption += text; }
    });
    await vlm.generate({
      ...inputs,
      max_new_tokens: MAX_NEW_TOKENS,
      do_sample: false,
      repetition_penalty: 1.2,
      streamer: streamer
    });
    lastCaption = caption.trim();
    caption = '';
    secondsPerCaption = (performance.now() - started) / 1000;
  } catch (error) {
    console.warn(error);
  }
  nextCaptionAt = millis() + PAUSE_MS;
  busy = false;
}

function drawCaption() {
  const boxHeight = 160;
  noStroke();
  fill(10, 13, 18, 225);
  rect(0, height - boxHeight, width, boxHeight);

  textAlign(LEFT, TOP);
  textWrap(WORD);
  fill(160);
  textSize(13);
  const status = state === 'ready'
    ? PROMPTS[promptIndex] + '  ·  ' + (secondsPerCaption ? nf(secondsPerCaption, 1, 1) + ' s per caption' : 'first caption…') + '  ·  tap for the next question'
    : '';
  text(status, 16, height - boxHeight + 12, width - 32, 36);

  // The last finished caption, large.
  fill(247);
  textSize(min(22, width / 24));
  text(lastCaption, 16, height - boxHeight + 44, width - 32, boxHeight - 80);

  // The one being written now, small, as the model streams it.
  fill(120);
  textSize(13);
  text(caption ? '✎ ' + caption.trim() : '', 16, height - 30, width - 32, 24);
}

function drawConfirm() {
  fill(0, 190);
  rect(0, 0, width, height);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(18);
  textWrap(WORD);
  text('Tap to download FastVLM\n(about 770 MB, saved by the browser for next time).\nWi-Fi recommended.', 20, height / 2 - 60, width - 40, 120);
}

function mousePressed() {
  if (cameraSwitchJustPressed() || !cam.ready) return false;
  if (state === 'confirm') loadVlm();
  else if (state === 'ready') promptIndex = (promptIndex + 1) % PROMPTS.length;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

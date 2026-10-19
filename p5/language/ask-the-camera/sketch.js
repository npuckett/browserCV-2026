// ==============================================
// ASK THE CAMERA — Chrome's built-in Prompt API with images
// ==============================================
// Chrome 148+ on desktop includes an on-device language model (Gemini Nano)
// that accepts images. Type a question and the sketch sends it with the
// current camera frame. Nothing leaves the computer and there is no API key.
//
// Desktop Chrome only: Windows 10/11, macOS 13+, Linux, Chromebook Plus.
// Phones, other browsers and the p5.js Web Editor show an explanation instead.
//
// Key data:
//   availability   'unavailable' | 'downloadable' | 'downloading' | 'available'
//   session        LanguageModel session (created on your first question)
//   answer         the reply, filled in as it streams
// ==============================================

// The same options go to availability() and create().
const MODEL_OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }]
};

let cam;
let availability = 'checking';
let session = null;
let busy = false;
let question = '';
let answer = '';
let askedFrame = null;   // thumbnail of the frame the question was about
let questionInput;
let askButton;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  // Embedded mode blocks phone gestures on the canvas only, so the text field
  // still takes focus and typing. (Plain lockGestures() blocks it.)
  lockGestures({ mode: 'embedded', element: canvas.elt });
  textFont('system-ui');

  cam = createPhoneCamera(window.isMobile ? 'environment' : 'user', !window.isMobile, 'contain');
  createCameraSwitch(cam);
  enableCameraTap('Tap to enable camera');

  createQuestionBox();
  checkAvailability();
}

async function checkAvailability() {
  if (!('LanguageModel' in window)) {
    availability = 'unavailable';
    setError('This needs Chrome 148 or later on a desktop computer (Windows, macOS, Linux or Chromebook Plus). ' +
      'Phones, other browsers and embedded previews such as the p5.js Web Editor do not have the Prompt API. ' +
      'Try live-caption for a model that runs in other browsers.');
    questionInput.hide();
    askButton.hide();
    return;
  }
  availability = await LanguageModel.availability(MODEL_OPTIONS);
  if (availability === 'unavailable') {
    setError('Chrome reports the on-device model is unavailable here. It needs about 22 GB of free disk space ' +
      'and either a GPU with more than 4 GB of memory or 16 GB of RAM with 4 CPU cores.');
  }
}

// The first question creates the session. That must happen in a click,
// because Chrome may need to download the model (a few GB) first.
async function ask() {
  question = questionInput.value().trim();
  if (!question || busy || !cam.ready || availability === 'unavailable') return;
  busy = true;
  answer = '';
  try {
    if (!session) {
      setLoading('Preparing the on-device model');
      session = await LanguageModel.create({
        ...MODEL_OPTIONS,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => setLoading('Downloading the model (first time only)', e.loaded));
        }
      });
      clearLoading();
    }

    askedFrame = snapshot();
    // Images go in the message content next to the text. A <video> element
    // sends its current frame. (The frame is not mirrored.)
    const stream = session.promptStreaming([{
      role: 'user',
      content: [
        { type: 'text', value: question },
        { type: 'image', value: cam.videoElement }
      ]
    }]);
    for await (const chunk of stream) {
      answer += chunk;
    }
  } catch (error) {
    clearLoading();
    answer = 'Error: ' + error.message;
  }
  busy = false;
}

function snapshot() {
  const video = cam.videoElement;
  const thumb = createGraphics(160, round(160 * video.videoHeight / video.videoWidth));
  if (cam.mirror) {
    thumb.translate(thumb.width, 0);
    thumb.scale(-1, 1);
  }
  thumb.drawingContext.drawImage(video, 0, 0, thumb.width, thumb.height);
  return thumb;
}

function draw() {
  background(16, 19, 24);
  drawPhoneCamera(cam);
  drawAnswer();
  drawStatus();
}

function drawAnswer() {
  const top = height - 190;
  noStroke();
  fill(10, 13, 18, 225);
  rect(0, top, width, 190);

  let textLeft = 16;
  if (askedFrame) {
    image(askedFrame, 16, top + 60, 96, 96 * askedFrame.height / askedFrame.width);
    textLeft = 124;
  }

  fill(170);
  textSize(13);
  textAlign(LEFT, TOP);
  const status = busy ? 'thinking…' : availability === 'checking' ? '' : 'model: ' + availability;
  text(status, 16, top + 64 - 22);

  fill(247);
  textSize(16);
  textWrap(WORD);
  const shown = answer || (question ? '' : 'Ask something about what the camera sees, e.g. "What am I holding?"');
  text(shown, textLeft, top + 60, width - textLeft - 16, 120);
}

// A text field and button above the answer area.
function createQuestionBox() {
  questionInput = createInput('What do you see?');
  questionInput.position(16, windowHeight - 180);
  questionInput.size(windowWidth - 120, 30);
  questionInput.style('font', '16px system-ui');
  questionInput.style('border', '0');
  questionInput.style('border-radius', '6px');
  questionInput.style('padding', '4px 8px');
  questionInput.elt.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') ask();
  });

  askButton = createButton('Ask');
  askButton.position(windowWidth - 90, windowHeight - 180);
  askButton.size(74, 40);
  askButton.style('font', '700 15px system-ui');
  askButton.style('border', '0');
  askButton.style('border-radius', '6px');
  askButton.style('background', '#ffd200');
  askButton.mousePressed(ask);
}

function mousePressed() {
  // Let clicks reach the text field and button.
  return true;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  questionInput.position(16, windowHeight - 180);
  questionInput.size(windowWidth - 120, 30);
  askButton.position(windowWidth - 90, windowHeight - 180);
}

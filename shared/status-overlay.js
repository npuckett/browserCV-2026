// ==============================================
// status-overlay.js — loading and error messages for three.js pages
// ==============================================
// The DOM version of loading.js (which draws on a p5 canvas). The spinner
// follows three-phone's examples/ml5/ml5-loading.js.
//
//   showStatus('Loading model')        spinner with a message
//   showStatus('Downloading', 0.4)     ... with a progress bar (0..1)
//   hideStatus()
//   showError('Not supported here')    a message that stays
//   showCameraOff()                    the camera did not start: how to turn it on
// ==============================================

let cvStatusElement = null;

function cvStatusEnsure() {
  if (cvStatusElement) return cvStatusElement;
  const style = document.createElement('style');
  style.textContent = `
    .cv-status { position: fixed; inset: 0; z-index: 30; display: none; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px; padding: 24px; text-align: center;
      color: #fff; background: rgba(0, 0, 0, 0.72); font: 16px/1.4 system-ui, sans-serif; pointer-events: none; }
    .cv-status-ring { width: 56px; height: 56px; border: 7px solid rgba(255,255,255,0.25);
      border-top-color: #fff; border-radius: 50%; animation: cv-status-spin 0.9s linear infinite; }
    .cv-status-bar { width: min(240px, 70vw); height: 6px; border-radius: 3px; background: rgba(255,255,255,0.25); overflow: hidden; }
    .cv-status-bar > div { height: 100%; width: 0; background: #fff; }
    .cv-status.error .cv-status-ring, .cv-status.error .cv-status-bar { display: none; }
    .cv-status.error { pointer-events: auto; }
    .cv-status.error .cv-status-message { max-width: 460px; background: #1e222c; padding: 20px; border-radius: 10px; }
    .cv-status.camera-off { background: none; justify-content: flex-start; pointer-events: none; }
    @keyframes cv-status-spin { to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
  cvStatusElement = document.createElement('div');
  cvStatusElement.className = 'cv-status';
  cvStatusElement.innerHTML = '<div class="cv-status-ring"></div><div class="cv-status-message"></div><div class="cv-status-bar"><div></div></div>';
  document.body.appendChild(cvStatusElement);
  return cvStatusElement;
}

function showStatus(message, progress) {
  const element = cvStatusEnsure();
  element.classList.remove('error', 'camera-off');
  element.querySelector('.cv-status-message').textContent = message;
  const bar = element.querySelector('.cv-status-bar');
  bar.style.display = typeof progress === 'number' ? 'block' : 'none';
  if (typeof progress === 'number') bar.firstChild.style.width = Math.round(progress * 100) + '%';
  element.style.display = 'flex';
}

function hideStatus() {
  if (cvStatusElement && !cvStatusElement.classList.contains('error')) cvStatusElement.style.display = 'none';
}

function showError(message) {
  const element = cvStatusEnsure();
  element.classList.remove('camera-off');
  element.classList.add('error');
  element.querySelector('.cv-status-message').textContent = message;
  element.style.display = 'flex';
  console.error(message);
}

// The camera did not start: the person tapped "Don't Allow", or there is no
// camera. The message sits at the top, so the scene behind it stays in view.
function showCameraOff() {
  const canAsk = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  showError(canAsk
    ? 'The camera is off. To turn it on, allow the camera for this page in your browser settings. Then reload the page.'
    : 'This browser cannot open the camera. Open this page in Chrome or Safari.');
  cvStatusElement.classList.add('camera-off');
}

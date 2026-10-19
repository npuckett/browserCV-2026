// ==============================================
// three-helpers.js — small helpers for the three.js examples
// ==============================================
// Needs window.THREE (set by the page's module loader, three-phone style).
//
//   const f = matchCameraToVideo(camera, cam, renderer, 60);
//       Sets a PerspectiveCamera's fov and aspect so 3D objects line up with a
//       three-phone camera feed shown with mode 'cover' (cam.attachBackground).
//       Returns the focal length in video pixels, for pose estimation.
//
//   const label = makeLabel('cup 92%');
//       A text sprite that always faces the camera.
//
//   IS_PHONE
//       true on phones and tablets. p5-phone sets window.isMobile, but
//       three-phone has no equivalent, so this repeats p5-phone's checks.
// ==============================================

// Same checks as p5-phone's _isMobileDevice(): mobile user agent, iPadOS
// (a Mac user agent with touch), or a finger as the main pointer.
const IS_PHONE = (() => {
  const ua = navigator.userAgent || '';
  return /android|iphone|ipod|mobile|windows phone/i.test(ua) ||
    (/mac/i.test(ua) && navigator.maxTouchPoints > 1) ||
    window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && !window.matchMedia('(any-pointer: fine)').matches);
})();

// A camera's field of view is rarely known exactly. Most laptop webcams and
// phone cameras fall between 55° and 75° horizontally; 60° is a fair guess.
function matchCameraToVideo(camera, cam, renderer, horizontalFovDegrees) {
  const video = cam.videoElement;
  if (!video || !video.videoWidth) return null;
  const canvas = { w: renderer.domElement.clientWidth, h: renderer.domElement.clientHeight };
  // Focal length in video pixels, from the assumed horizontal field of view.
  const focal = (video.videoWidth / 2) / Math.tan(THREE.MathUtils.degToRad(horizontalFovDegrees) / 2);
  // 'cover' scales the video to fill the canvas and crops the rest. Work out
  // how many video pixels tall the visible part is.
  const scale = Math.max(canvas.w / video.videoWidth, canvas.h / video.videoHeight);
  const visibleHeight = canvas.h / scale;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((visibleHeight / 2) / focal));
  camera.aspect = canvas.w / canvas.h;
  camera.updateProjectionMatrix();
  return focal;
}

// Text drawn on a canvas, used as a sprite texture. Height is in scene units.
function makeLabel(message, options = {}) {
  const height = options.height || 0.05;
  const background = options.background || 'rgba(0, 0, 0, 0.7)';
  const color = options.color || '#ffffff';
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  const fontSize = 48;
  context.font = '600 ' + fontSize + 'px system-ui, sans-serif';
  const textWidth = context.measureText(message).width;
  canvas.width = Math.ceil(textWidth + fontSize);
  canvas.height = Math.ceil(fontSize * 1.6);
  context.font = '600 ' + fontSize + 'px system-ui, sans-serif';
  context.fillStyle = background;
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, fontSize * 0.4);
  context.fill();
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.fillText(message, fontSize / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
  sprite.scale.set(height * canvas.width / canvas.height, height, 1);
  sprite.renderOrder = 10;
  return sprite;
}

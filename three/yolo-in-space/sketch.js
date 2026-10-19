// ==============================================
// YOLO IN SPACE — detections pinned around you
// ==============================================
// YOLO finds objects in the camera image. Each detection drops a labeled pin
// into the three.js scene, along the line from the camera through the object.
// On a phone, three-phone's magic-window AR turns the 3D camera with the
// device, so pins stay where you found things: scan the room, then turn
// around and the pins are still there.
//
// Pins don't know how far away objects are (YOLO gives no depth), so every
// pin sits PIN_DISTANCE away, like labels on the inside of a sphere.
//
// three-phone APIs: createPhoneCamera(), cam.attachBackground(), cam.mapPoint(),
// enableARTap() (camera + motion in one tap), applyDeviceRotation(),
// setPhoneCanvas(), lockGestures(), window.arEnabled.
//
// Key data:
//   results.boxes   [{ x1, y1, x2, y2, conf, name, color }] in video pixels
//   pins            [{ label, direction, group, lastSeen }]: one per object found
// ==============================================

const YOLO_URL = 'https://cdn.jsdelivr.net/npm/@ultralytics/yolo@0.0.51/+esm';
const MODEL_URL = '../../models/yolo26n.onnx';
const CAMERA_FOV_DEGREES = 60;
const PIN_DISTANCE = 2;          // meters from the viewer
const MIN_CONFIDENCE = 0.5;
const SAME_PIN_DEGREES = 6;      // a detection this close to a pin with the same label updates it
const FORGET_SECONDS = 30;       // pins not seen for this long fade away
const MAX_PINS = 30;

let renderer, scene, camera, cam;
let yolo = null;
let busy = false;
const pins = [];

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318);
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.05, 50);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));

  // Phones scan the room with the rear camera; desktop webcams face you.
  cam = createPhoneCamera(IS_PHONE ? 'environment' : 'user', !IS_PHONE, 'cover');
  cam.onReady(() => cam.attachBackground(scene));

  setPhoneCanvas(renderer);
  enableARTap('Tap to start (camera and motion)');
  lockGestures();
  addEventListener('resize', onResize);

  loadYolo();
  animate();
}

async function loadYolo() {
  try {
    showStatus('Loading YOLO');
    const { YOLO } = await import(YOLO_URL);
    showStatus('Downloading model and runtime (about 16 MB)');
    yolo = await YOLO.load(MODEL_URL, { device: 'auto' });
    hideStatus();
  } catch (error) {
    showError('Could not load YOLO: ' + error.message);
  }
}

function animate() {
  requestAnimationFrame(animate);

  // Turn the 3D camera with the phone. (On a desktop there's no motion data:
  // the default orientation would point the camera at the floor, so skip it.)
  if (IS_PHONE && window.arEnabled) applyDeviceRotation(camera, { smooth: 0.15 });

  if (yolo && cam.ready && !busy && isNewFrame(cam)) {
    matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    detect();
  }

  fadeOldPins();
  renderer.render(scene, camera);
}

function detect() {
  busy = true;
  // Remember where the camera pointed when this frame was taken, so pins land
  // in the right place even if the phone turns while YOLO is working.
  camera.updateMatrixWorld();
  const cameraAtCapture = camera.clone();
  yolo.predict(cam.videoElement, { conf: MIN_CONFIDENCE })
    .then((results) => {
      for (const box of results.boxes) addOrUpdatePin(box, cameraAtCapture);
    })
    .catch((error) => console.warn(error))
    .finally(() => { busy = false; });
}

// Box center -> screen point -> a direction in the 3D world.
function addOrUpdatePin(box, viewCamera) {
  const screen = cam.mapPoint((box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2);
  const ndc = new THREE.Vector3((screen.x / innerWidth) * 2 - 1, 1 - (screen.y / innerHeight) * 2, 0.5);
  const direction = ndc.unproject(viewCamera).sub(viewCamera.position).normalize();

  const limit = THREE.MathUtils.degToRad(SAME_PIN_DEGREES);
  let pin = pins.find((p) => p.label === box.name && p.direction.angleTo(direction) < limit);
  if (pin) {
    pin.direction.lerp(direction, 0.3).normalize(); // settle toward the newest sighting
  } else {
    if (pins.length >= MAX_PINS) removePin(pins[0]);
    pin = createPin(box.name, box.color, direction);
  }
  pin.lastSeen = performance.now();
  pin.group.position.copy(pin.direction).multiplyScalar(PIN_DISTANCE);
}

function createPin(label, color, direction) {
  const group = new THREE.Group();
  const dot = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 12),
    new THREE.MeshBasicMaterial({ color: color, transparent: true })
  );
  group.add(dot);
  const sprite = makeLabel(label, { height: 0.09, background: color, color: '#000000' });
  sprite.position.y = 0.09;
  group.add(sprite);
  scene.add(group);
  const pin = { label: label, direction: direction.clone(), group: group, lastSeen: 0 };
  pins.push(pin);
  return pin;
}

function fadeOldPins() {
  const now = performance.now();
  for (const pin of [...pins]) {
    const age = (now - pin.lastSeen) / 1000;
    const opacity = THREE.MathUtils.clamp(1 - (age - FORGET_SECONDS) / 5, 0, 1);
    pin.group.traverse((child) => { if (child.material) child.material.opacity = opacity; });
    if (opacity === 0) removePin(pin);
  }
}

function removePin(pin) {
  scene.remove(pin.group);
  pin.group.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (child.material.map) child.material.map.dispose();
      child.material.dispose();
    }
  });
  pins.splice(pins.indexOf(pin), 1);
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  if (cam.ready) {
    matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    cam.updateBackground();
  }
}

init();

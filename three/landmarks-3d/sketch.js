// ==============================================
// LANDMARKS 3D — a 3D hand skeleton from MediaPipe
// ==============================================
// MediaPipe's HandLandmarker returns each hand twice:
//   landmarks        21 points in image space (x, y from 0 to 1)
//   worldLandmarks   the same 21 points in meters, around the hand's center
// The world landmarks give a true 3D hand, so this sketch builds joints and
// bones from them and floats the skeleton over your real hand: the image
// landmarks say where on screen, and the ratio of real size to image size
// says how far away.
//
// Pinch thumb and index together to light the bones up.
//
// MediaPipe is loaded the way Golan Levin's p5 sketches load it: a dynamic
// import() from a plain, non-module script (https://editor.p5js.org/golan/sketches/0XkgzZGe8).
//
// three-phone APIs: createPhoneCamera(), cam.attachBackground(), cam.mapPoint(),
// enableCameraTap(), setPhoneCanvas(), lockGestures().
//
// Key data:
//   result.landmarks[h]        21 × { x, y, z } normalized to the video
//   result.worldLandmarks[h]   21 × { x, y, z } meters (x right, y down, z away)
//   result.handedness[h][0]    { categoryName: 'Left' | 'Right', score }
//   pinch                      thumb-tip to index-tip distance in meters
// ==============================================

const MP_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const CAMERA_FOV_DEGREES = 60;

// Pairs of landmarks joined by a bone.
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4],          // thumb
  [0, 5], [5, 6], [6, 7], [7, 8],          // index
  [5, 9], [9, 10], [10, 11], [11, 12],     // middle
  [9, 13], [13, 14], [14, 15], [15, 16],   // ring
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // pinky and palm
];

let renderer, scene, camera, cam;
let landmarker = null;
let lastTimestamp = 0;
let focalVideo = null;
const hands = [makeHand(0x5dd0ff), makeHand(0xff7a9c)];

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318);
  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 20);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(0.3, 0.6, 1);
  scene.add(key);
  for (const hand of hands) scene.add(hand.group);

  // Mirrored front camera: it feels like a mirror. The skeleton is mirrored to match.
  cam = createPhoneCamera('user', true, 'cover');
  cam.onReady(() => cam.attachBackground(scene));

  setPhoneCanvas(renderer);
  enableCameraTap('Tap to enable the camera');
  lockGestures();
  addEventListener('resize', onResize);

  loadLandmarker();
  animate();
}

async function loadLandmarker() {
  try {
    showStatus('Loading MediaPipe');
    const { HandLandmarker, FilesetResolver } = await import(MP_URL + '/vision_bundle.mjs');
    const vision = await FilesetResolver.forVisionTasks(MP_URL + '/wasm');
    showStatus('Downloading hand model (8 MB)');
    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 2
    };
    try {
      landmarker = await HandLandmarker.createFromOptions(vision, options);
    } catch (gpuError) {
      options.baseOptions.delegate = 'CPU';
      landmarker = await HandLandmarker.createFromOptions(vision, options);
    }
    hideStatus();
  } catch (error) {
    showError('Could not load MediaPipe: ' + error.message);
  }
}

function animate() {
  requestAnimationFrame(animate);

  const video = cam.videoElement;
  if (landmarker && isNewFrame(cam) && video.videoWidth > 0) {
    focalVideo = matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    lastTimestamp = Math.max(performance.now(), lastTimestamp + 1);
    const result = landmarker.detectForVideo(video, lastTimestamp);
    hands.forEach((hand, i) => updateHand(hand, result, i, video));
  }

  renderer.render(scene, camera);
}

function updateHand(hand, result, index, video) {
  const world = result.worldLandmarks[index];
  const image = result.landmarks[index];
  if (!world || !image) {
    hand.group.visible = false;
    return;
  }
  hand.group.visible = true;

  // World landmarks: meters, x right, y down, z away from the camera.
  // three.js: y up, z toward the viewer. Mirror x when the view is mirrored.
  const flipX = cam.mirror ? -1 : 1;
  const points = world.map((p) => new THREE.Vector3(flipX * p.x, -p.y, -p.z));

  // How far away is the hand? Compare its real size (wrist to middle knuckle,
  // in meters) with its size in the image (in video pixels).
  const realSpan = points[0].distanceTo(points[9]);
  const imageSpan = Math.hypot((image[0].x - image[9].x) * video.videoWidth, (image[0].y - image[9].y) * video.videoHeight);
  const distance = focalVideo * realSpan / Math.max(imageSpan, 1);

  // Where on screen? The average image landmark, mapped like the background.
  const center = image.reduce((sum, p) => ({ x: sum.x + p.x / image.length, y: sum.y + p.y / image.length }), { x: 0, y: 0 });
  const screen = cam.mapPoint(center.x * video.videoWidth, center.y * video.videoHeight);
  const ndc = new THREE.Vector3((screen.x / innerWidth) * 2 - 1, 1 - (screen.y / innerHeight) * 2, 0.5);
  const direction = ndc.unproject(camera).normalize();
  // Place the skeleton along that ray, at the estimated distance in depth.
  hand.group.position.copy(direction.multiplyScalar(distance / -direction.z));

  points.forEach((p, i) => hand.joints[i].position.copy(p));
  BONES.forEach(([a, b], i) => placeBone(hand.bones[i], points[a], points[b]));

  // Pinch: thumb tip (4) to index tip (8), in meters.
  const pinch = points[4].distanceTo(points[8]);
  const glowing = pinch < 0.03;
  hand.boneMaterial.emissive.setHex(glowing ? 0xffd200 : 0x000000);
  hand.boneMaterial.emissiveIntensity = glowing ? 1 : 0;
}

// Joints are spheres; bones are cylinders stretched between two joints.
function makeHand(color) {
  const group = new THREE.Group();
  group.visible = false;
  const jointMaterial = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3 });
  const boneMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const joints = [];
  for (let i = 0; i < 21; i += 1) {
    const joint = new THREE.Mesh(new THREE.SphereGeometry(i % 4 === 0 ? 0.008 : 0.006, 16, 12), jointMaterial);
    group.add(joint);
    joints.push(joint);
  }
  const bones = BONES.map(() => {
    const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 1, 8), boneMaterial);
    group.add(bone);
    return bone;
  });
  return { group, joints, bones, boneMaterial };
}

const UP = new THREE.Vector3(0, 1, 0);
function placeBone(bone, a, b) {
  const direction = new THREE.Vector3().subVectors(b, a);
  bone.position.copy(a).addScaledVector(direction, 0.5);
  bone.scale.set(1, direction.length(), 1);
  bone.quaternion.setFromUnitVectors(UP, direction.normalize());
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  if (cam.ready) {
    matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    cam.updateBackground();
  }
}

init();

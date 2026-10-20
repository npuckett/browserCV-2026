// ==============================================
// APRILTAG POSE — 3D objects on AprilTags
// ==============================================
// The official AprilTag library (WebAssembly, in a Web Worker) finds tag36h11
// tags and estimates each one's 3D pose from the camera's intrinsics: its
// focal length and center, in pixels. A three.js object stands on each tag.
//
// Print tags from markers/print-apriltag.html and set TAG_SIZE to the width
// of the black square, in meters.
//
// three-phone APIs: createPhoneCamera(), cam.attachBackground(),
// enableCameraTap(), setPhoneCanvas(), lockGestures(), userSetupComplete().
//
// Key data:
//   detection.pose.R   3×3 rotation, stored column by column (R[col][row])
//   detection.pose.t   [x, y, z] in meters, OpenCV camera axes:
//                      x right, y down, z straight ahead
//   anchors            { [id]: THREE.Group } in tag space
// ==============================================

const TAG_SIZE = 0.06;          // meters: the black square of the printed tag
const CAMERA_FOV_DEGREES = 60;  // horizontal field of view; adjust if objects float or sink
const SCAN_SIZE = 640;

let renderer, scene, camera, cam;
let detector = null;
let detectorReady = false;
let busy = false;
let intrinsicsFor = '';
const anchors = {};

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318);
  camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 50);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(0.5, 1, 1);
  scene.add(key);

  // Not mirrored, even on desktop: the 3D objects must match the real image.
  cam = createPhoneCamera(IS_PHONE ? 'environment' : 'user', false, 'cover');
  cam.onReady(() => cam.attachBackground(scene));

  setPhoneCanvas(renderer);
  enableCameraTap('Tap to enable the camera');
  lockGestures();
  addEventListener('resize', onResize);

  startDetector();
  animate();
}

async function startDetector() {
  showStatus('Starting AprilTag detector');
  const Apriltag = Comlink.wrap(new Worker('../../vendor/apriltag/apriltag.js'));
  detector = await new Apriltag(Comlink.proxy(() => {
    detectorReady = true;
    hideStatus();
  }));
}

// three-phone calls this after the tap, also when the camera did not start.
function userSetupComplete() {
  if (window.cameraEnabled) return;
  showCameraOff();
  // Show one pillar on its own, so the page is not empty.
  const anchor = anchors[0] || createAnchor(0);
  anchor.matrix.makeRotationFromEuler(new THREE.Euler(-0.9, 0, 0.6)); // lying on a table, turned a little
  anchor.matrix.setPosition(0, -0.03, -0.45); // 45 cm in front of the camera
  anchor.matrixWorldNeedsUpdate = true;
  anchor.visible = true;
}

function animate() {
  requestAnimationFrame(animate);

  if (detectorReady && cam.ready && !busy && isNewFrame(cam)) {
    const focalVideo = matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame && focalVideo) detectTags(frame, focalVideo * frame.scale);
  }

  renderer.render(scene, camera);
}

async function detectTags(frame, focal) {
  busy = true;
  try {
    // The detector needs the intrinsics in pixels of the frame it receives.
    const key = frame.width + 'x' + frame.height + '@' + focal.toFixed(1);
    if (key !== intrinsicsFor) {
      await detector.set_camera_info(focal, focal, frame.width / 2, frame.height / 2);
      for (let id = 0; id < 16; id += 1) await detector.set_tag_size(id, TAG_SIZE);
      intrinsicsFor = key;
    }

    const rgba = frame.imageData.data;
    const gray = new Uint8Array(frame.width * frame.height);
    for (let i = 0, j = 0; i < gray.length; i += 1, j += 4) {
      gray[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
    }
    const detections = await detector.detect(gray, frame.width, frame.height);

    const seen = new Set();
    if (Array.isArray(detections)) {
      for (const d of detections) {
        if (!d.pose) continue;
        const anchor = anchors[d.id] || createAnchor(d.id);
        setAnchorPose(anchor, d.pose.R, d.pose.t);
        anchor.visible = true;
        seen.add(String(d.id));
      }
    }
    for (const id of Object.keys(anchors)) {
      if (!seen.has(id)) anchors[id].visible = false;
    }
  } catch (error) {
    console.warn(error);
  }
  busy = false;
}

// OpenCV axes (y down, z forward) -> three.js axes (y up, z backward): flip
// y and z on both sides of the transform. R is column-major, so R[c][r].
function setAnchorPose(anchor, R, t) {
  anchor.matrix.set(
    R[0][0], -R[1][0], -R[2][0], t[0],
    -R[0][1], R[1][1], R[2][1], -t[1],
    -R[0][2], R[1][2], R[2][2], -t[2],
    0, 0, 0, 1
  );
  anchor.matrixWorldNeedsUpdate = true;
}

// Tag space: the tag lies in the x/y plane at the origin, +z out of the paper.
function createAnchor(id) {
  const anchor = new THREE.Group();
  anchor.matrixAutoUpdate = false;

  const color = new THREE.Color().setHSL((id * 0.23) % 1, 0.75, 0.55);
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(TAG_SIZE * 0.25, TAG_SIZE * 0.4, TAG_SIZE * 1.2, 24),
    new THREE.MeshStandardMaterial({ color: color, roughness: 0.35 })
  );
  pillar.rotation.x = Math.PI / 2; // a cylinder stands along y; turn it to stand along z
  pillar.position.z = TAG_SIZE * 0.6;
  anchor.add(pillar);

  const frameOutline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(TAG_SIZE, TAG_SIZE)),
    new THREE.LineBasicMaterial({ color: color })
  );
  anchor.add(frameOutline);

  const label = makeLabel('tag ' + id, { height: TAG_SIZE * 0.4 });
  label.position.set(0, 0, TAG_SIZE * 1.6);
  anchor.add(label);

  scene.add(anchor);
  anchors[id] = anchor;
  return anchor;
}

function onResize() {
  renderer.setSize(innerWidth, innerHeight);
  if (cam.ready) {
    matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    cam.updateBackground();
  } else {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
}

init();

// ==============================================
// ARUCO POSE — a 3D object sitting on a printed marker
// ==============================================
// js-aruco2 finds ArUco markers in the camera image, and its POSIT solver
// works out each marker's position and rotation in 3D. A three.js cube is
// placed on every marker it sees, over the camera feed.
//
// Print markers from markers/print-aruco.html (ARUCO_MIP_36h12) and measure
// one: set MARKER_SIZE to its black square in meters.
//
// three-phone APIs: createPhoneCamera(), cam.attachBackground(),
// enableCameraTap(), setPhoneCanvas(), lockGestures(), userSetupComplete().
//
// Key data:
//   pose.bestRotation     3×3 rotation (rows), from POS.Posit
//   pose.bestTranslation  [x, y, z] in meters (x right, y up, z away from the camera)
//   anchors               { [id]: THREE.Group } placed with the pose each frame
// ==============================================

const MARKER_SIZE = 0.06;       // meters: the black square of the printed marker
const CAMERA_FOV_DEGREES = 60;  // horizontal field of view; adjust if objects float or sink
const SCAN_SIZE = 640;

let renderer, scene, camera, cam, detector;
let focalVideo = null;          // focal length in video pixels (from the field of view)
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

  detector = new AR.Detector({ dictionaryName: 'ARUCO_MIP_36h12', maxHammingDistance: 5 });

  setPhoneCanvas(renderer);
  enableCameraTap('Tap to enable the camera');
  lockGestures();
  addEventListener('resize', onResize);
  animate();
}

// three-phone calls this after the tap, also when the camera did not start.
function userSetupComplete() {
  if (window.cameraEnabled) return;
  showCameraOff();
  // Show one cube on its own, so the page is not empty.
  const anchor = anchors[0] || createAnchor(0);
  anchor.matrix.makeRotationFromEuler(new THREE.Euler(-0.9, 0, 0.6)); // lying on a table, turned a little
  anchor.matrix.setPosition(0, -0.03, -0.45); // 45 cm in front of the camera
  anchor.matrixWorldNeedsUpdate = true;
  anchor.visible = true;
}

function animate() {
  requestAnimationFrame(animate);

  if (cam.ready && isNewFrame(cam)) {
    focalVideo = matchCameraToVideo(camera, cam, renderer, CAMERA_FOV_DEGREES);
    const frame = grabFrame(cam, SCAN_SIZE);
    if (frame && focalVideo) updatePoses(frame);
  }

  renderer.render(scene, camera);
}

function updatePoses(frame) {
  const markers = detector.detect(frame.imageData);
  // POSIT needs the focal length in pixels of the frame it measures.
  const posit = new POS.Posit(MARKER_SIZE, focalVideo * frame.scale);
  const seen = new Set();

  for (const marker of markers) {
    // POSIT wants corners measured from the image center, with y pointing up.
    const corners = marker.corners.map((c) => ({ x: c.x - frame.width / 2, y: frame.height / 2 - c.y }));
    const pose = posit.pose(corners);
    const anchor = anchors[marker.id] || createAnchor(marker.id);
    setAnchorPose(anchor, pose.bestRotation, pose.bestTranslation);
    anchor.visible = true;
    seen.add(String(marker.id));
  }

  for (const id of Object.keys(anchors)) {
    if (!seen.has(id)) anchors[id].visible = false;
  }
}

// POSIT's camera looks down +z with y up; three.js looks down −z. Flipping z
// on both sides of the rotation converts one to the other.
function setAnchorPose(anchor, r, t) {
  anchor.matrix.set(
    r[0][0], r[0][1], -r[0][2], t[0],
    r[1][0], r[1][1], -r[1][2], t[1],
    -r[2][0], -r[2][1], r[2][2], -t[2],
    0, 0, 0, 1
  );
  anchor.matrixWorldNeedsUpdate = true;
}

// Everything inside the anchor is in marker space: the marker lies in the
// x/y plane, centered on the origin, and +z points out of the paper.
function createAnchor(id) {
  const anchor = new THREE.Group();
  anchor.matrixAutoUpdate = false;

  const hue = (id * 0.17) % 1;
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(MARKER_SIZE, MARKER_SIZE, MARKER_SIZE),
    new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(hue, 0.7, 0.55), roughness: 0.4, transparent: true, opacity: 0.85 })
  );
  cube.position.z = MARKER_SIZE / 2; // sit on the marker, not through it
  anchor.add(cube);

  const axes = new THREE.AxesHelper(MARKER_SIZE * 0.8); // red x, green y, blue z
  axes.material.depthTest = false;
  anchor.add(axes);

  const label = makeLabel('id ' + id, { height: MARKER_SIZE * 0.4 });
  label.position.set(0, 0, MARKER_SIZE * 1.4);
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

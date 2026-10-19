// ==============================================
// DEPTH POINT CLOUD — the camera image as 3D points
// ==============================================
// Depth Anything V2 (small, via Transformers.js) estimates depth for every
// pixel. Each pixel becomes a point in a three.js point cloud: placed by its
// position in the image and pushed toward you by its depth, colored with the
// camera's color. Drag to orbit, pinch or scroll to zoom.
//
// Depth Anything gives relative depth (nearer/farther within one frame), not
// meters, so the cloud's depth is scaled by DEPTH_SCALE for a clear effect.
//
// three-phone APIs: createPhoneCamera(), enableCameraTap(), setPhoneCanvas().
//
// Key data:
//   depthImage    RawImage { width, height, data }: one byte per pixel, 255 = nearest
//   positions     Float32Array of x, y, z per point (the cloud's geometry)
//   colors        Float32Array of r, g, b per point, from the camera frame
// ==============================================

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';
const MODEL_ID = 'onnx-community/depth-anything-v2-small';
const INPUT_SIZE = IS_PHONE ? 224 : 320; // longest side of the frame = points across
const CLOUD_WIDTH = 4;     // scene units across the cloud
const DEPTH_SCALE = 2.2;   // how far the nearest point comes forward

let renderer, scene, camera, controls, cam;
let estimator = null;
let busy = false;
let points = null;
let frameCanvas, frameContext;

async function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d12);
  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 100);
  camera.position.set(0, 0, 5);

  // OrbitControls is an ES module; import() works from this plain script.
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, DEPTH_SCALE / 2);

  cam = createPhoneCamera(IS_PHONE ? 'environment' : 'user', !IS_PHONE, 'cover');
  frameCanvas = document.createElement('canvas');
  frameContext = frameCanvas.getContext('2d', { willReadFrequently: true });

  setPhoneCanvas(renderer);
  enableCameraTap('Tap to enable the camera');
  addEventListener('resize', onResize);

  loadEstimator();
  animate();
}

async function loadEstimator() {
  try {
    showStatus('Loading Transformers.js');
    const { pipeline } = await import(TRANSFORMERS_URL);
    const adapter = navigator.gpu ? await navigator.gpu.requestAdapter() : null;
    const device = adapter ? 'webgpu' : 'wasm';
    const dtype = adapter ? (adapter.features.has('shader-f16') ? 'fp16' : 'fp32') : 'q8';
    estimator = await pipeline('depth-estimation', MODEL_ID, {
      device: device,
      dtype: dtype,
      progress_callback: (info) => {
        if (info.status === 'progress' && info.file.endsWith('.onnx')) {
          showStatus('Downloading depth model (' + dtype + ')', info.progress / 100);
        }
      }
    });
    hideStatus();
  } catch (error) {
    showError('Could not load the depth model: ' + error.message);
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (estimator && cam.ready && !busy && isNewFrame(cam)) estimateDepth();
  if (controls) controls.update();
  renderer.render(scene, camera);
}

async function estimateDepth() {
  busy = true;
  try {
    const video = cam.videoElement;
    const scale = INPUT_SIZE / Math.max(video.videoWidth, video.videoHeight);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    if (frameCanvas.width !== w || frameCanvas.height !== h) {
      frameCanvas.width = w;
      frameCanvas.height = h;
    }
    frameContext.drawImage(video, 0, 0, w, h);
    const pixels = frameContext.getImageData(0, 0, w, h).data;

    const { depth } = await estimator(frameCanvas);
    updateCloud(depth, pixels, w, h);
  } catch (error) {
    console.warn(error);
  }
  busy = false;
}

// One point per depth pixel. The geometry is rebuilt only when the size changes.
function updateCloud(depthImage, pixels, w, h) {
  const count = depthImage.width * depthImage.height;
  if (!points || points.geometry.attributes.position.count !== count) {
    if (points) {
      scene.remove(points);
      points.geometry.dispose();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const material = new THREE.PointsMaterial({ size: CLOUD_WIDTH / depthImage.width * 1.4, vertexColors: true });
    points = new THREE.Points(geometry, material);
    scene.add(points);
  }

  const positions = points.geometry.attributes.position.array;
  const colors = points.geometry.attributes.color.array;
  const cloudHeight = CLOUD_WIDTH * depthImage.height / depthImage.width;
  const flip = cam.mirror ? -1 : 1; // mirror the cloud like the mirrored webcam view
  // The depth map can differ in size from the frame; sample the frame to match.
  const sx = w / depthImage.width;
  const sy = h / depthImage.height;

  for (let y = 0, i = 0; y < depthImage.height; y += 1) {
    for (let x = 0; x < depthImage.width; x += 1, i += 1) {
      const nearness = depthImage.data[i] / 255;
      positions[i * 3] = flip * (x / depthImage.width - 0.5) * CLOUD_WIDTH;
      positions[i * 3 + 1] = (0.5 - y / depthImage.height) * cloudHeight;
      positions[i * 3 + 2] = nearness * DEPTH_SCALE;

      const p = 4 * (Math.floor(y * sy) * w + Math.floor(x * sx));
      colors[i * 3] = pixels[p] / 255;
      colors[i * 3 + 1] = pixels[p + 1] / 255;
      colors[i * 3 + 2] = pixels[p + 2] / 255;
    }
  }
  points.geometry.attributes.position.needsUpdate = true;
  points.geometry.attributes.color.needsUpdate = true;
}

function onResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

init();

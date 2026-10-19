// ==============================================
// IMAGE TARGET — a 3D object anchored to a printed image
// ==============================================
// MindAR recognizes a specific image (a poster, a card, a book cover) and
// tracks its position and angle, so three.js objects can sit on it. Here a
// glowing frame outlines the card and a shape floats above it.
//
// The target is described by a .mind file, made from your image with MindAR's
// compiler: https://hiukim.github.io/mind-ar-js-doc/tools/compile
// This example uses MindAR's sample card.
//
// MindAR opens the camera and creates the renderer, scene and camera itself.
//
// Key data:
//   mindarThree.addAnchor(0)       anchor for target 0 in the .mind file
//   anchor.group                   THREE.Group that follows the image. In its
//                                  space the image is 1 unit wide, centered on
//                                  the origin, facing +z.
//   anchor.onTargetFound / onTargetLost   callbacks when tracking starts and stops
// ==============================================

const TARGET_URL = 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind';
const TARGET_ASPECT = 0.552; // card.png height ÷ width: the anchor's plane is 1 × this

let mindarThree = null;
let floater;

async function start() {
  document.getElementById('start').style.display = 'none';
  setStatus('Loading MindAR');
  try {
    // MindAR is an ES module; import() works from this plain script.
    const { MindARThree } = await import('mindar-image-three');
    mindarThree = new MindARThree({
      container: document.getElementById('container'),
      imageTargetSrc: TARGET_URL,
      uiScanning: 'no',   // this page shows its own status instead
      uiLoading: 'no'
    });
    const { renderer, scene, camera } = mindarThree;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.5));

    buildContent(mindarThree.addAnchor(0));

    setStatus('Starting camera…');
    await mindarThree.start();
    setStatus('Point the camera at the card');
    lockGestures();

    renderer.setAnimationLoop(() => {
      floater.rotation.x += 0.01;
      floater.rotation.y += 0.02;
      renderer.render(scene, camera);
    });
  } catch (error) {
    setStatus('');
    showError('MindAR could not start: ' + error.message);
  }
}

// Everything added to anchor.group appears on the image when it's found.
function buildContent(anchor) {
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, TARGET_ASPECT)),
    new THREE.LineBasicMaterial({ color: 0x5dd0ff })
  );
  anchor.group.add(outline);

  const tint = new THREE.Mesh(
    new THREE.PlaneGeometry(1, TARGET_ASPECT),
    new THREE.MeshBasicMaterial({ color: 0x5dd0ff, transparent: true, opacity: 0.25 })
  );
  anchor.group.add(tint);

  floater = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.15, 0),
    new THREE.MeshStandardMaterial({ color: 0xffd200, roughness: 0.3, flatShading: true })
  );
  floater.position.z = 0.3; // above the image (+z points out of it)
  anchor.group.add(floater);

  anchor.onTargetFound = () => setStatus('Found the card');
  anchor.onTargetLost = () => setStatus('Lost it: point the camera at the card');
}

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

document.getElementById('startButton').addEventListener('click', start);

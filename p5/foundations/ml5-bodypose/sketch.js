// ==============================================
// ml5 BODYPOSE — arms up
// ==============================================
// ml5's BodyPose (BlazePose model) finds 33 landmarks on a body. This sketch
// draws the skeleton and checks whether each wrist is above its shoulder.
//
// Adapted from p5-phone's examples/ml5/PHONE_BodyPose_two_points. Full-window
// here so it works on desktop. Step back so your whole upper body is in view.
//
// Key data:
//   poses            ml5 results: [{ keypoints: [{ x, y, confidence, name }], ... }]
//   leftArmUp        true when the left wrist is above the left shoulder
//   rightArmUp       same for the right side
//   CONFIDENCE       keypoints below this confidence are ignored
//
// BlazePose keypoint indices:
//   0 nose · 11/12 shoulders · 13/14 elbows · 15/16 wrists
//   23/24 hips · 25/26 knees · 27/28 ankles (odd = left, even = right)
// ==============================================

let cam;
let bodyPose;
let poses = [];
let connections = [];
let showVideo = true;

let leftArmUp = false;
let rightArmUp = false;

const CONFIDENCE = 0.3;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textFont('system-ui');

  cam = createPhoneCamera('user', true, 'contain');
  createCameraSwitch(cam, {
    onBeforeSwitch: () => { if (bodyPose) bodyPose.detectStop(); poses = []; },
    onAfterSwitch: () => { if (bodyPose) bodyPose.detectStart(cam.videoElement, gotPoses); }
  });
  enableCameraTap('Tap to enable camera');
  showDesktopQr({ label: 'Open on your phone', size: 120 });

  setLoading('Waiting for camera');
  cam.onReady(() => {
    setLoading('Loading BodyPose');
    const options = {
      runtime: 'mediapipe',
      modelType: 'lite',       // 'lite' is fastest; 'full' and 'heavy' are more accurate
      enableSmoothing: true,
      flipped: false
    };
    bodyPose = ml5.bodyPose('BlazePose', options, () => {
      connections = bodyPose.getSkeleton();
      bodyPose.detectStart(cam.videoElement, gotPoses);
      clearLoading();
    });
  });
}

function gotPoses(results) {
  poses = results || [];
}

function draw() {
  background(16, 19, 24);
  if (showVideo) drawPhoneCamera(cam);

  leftArmUp = false;
  rightArmUp = false;

  for (const pose of poses) {
    const points = cam.mapKeypoints(pose.keypoints);

    // Skeleton lines between confident keypoints
    stroke(255, 200);
    strokeWeight(3);
    for (const [a, b] of connections) {
      if (points[a].confidence > CONFIDENCE && points[b].confidence > CONFIDENCE) {
        line(points[a].x, points[a].y, points[b].x, points[b].y);
      }
    }

    noStroke();
    fill(0, 220, 255);
    for (const point of points) {
      if (point.confidence > CONFIDENCE) circle(point.x, point.y, 10);
    }
  }

  if (poses.length > 0) {
    const points = poses[0].keypoints;
    // Compare in video coordinates: "above" means a smaller y.
    leftArmUp = isAbove(points[15], points[11]);
    rightArmUp = isAbove(points[16], points[12]);
    highlightWrist(cam.mapKeypoint(points[15]), leftArmUp);
    highlightWrist(cam.mapKeypoint(points[16]), rightArmUp);
  }

  drawPanel();
  drawStatus();
}

function isAbove(wrist, shoulder) {
  return wrist.confidence > CONFIDENCE && shoulder.confidence > CONFIDENCE && wrist.y < shoulder.y;
}

function highlightWrist(wrist, isUp) {
  if (wrist.confidence < CONFIDENCE) return;
  noFill();
  stroke(isUp ? color(255, 210, 0) : color(255, 255, 255, 120));
  strokeWeight(isUp ? 6 : 2);
  circle(wrist.x, wrist.y, isUp ? 60 : 36);
}

function drawPanel() {
  noStroke();
  fill(10, 13, 18, 210);
  rect(0, height - 52, width, 52);
  fill(247);
  textSize(15);
  textAlign(LEFT, CENTER);
  let message = 'Step back so your upper body is in view';
  if (!cam.ready) message = 'Waiting for camera';
  else if (poses.length > 0) {
    // Index 15 is the person's left wrist. With a mirrored front camera it
    // appears on the right of the screen, like a mirror.
    message = 'left arm ' + (leftArmUp ? 'UP' : 'down') + ' · right arm ' + (rightArmUp ? 'UP' : 'down');
  }
  text(message + ' · tap to ' + (showVideo ? 'hide' : 'show') + ' video', 16, height - 26);
}

function mousePressed() {
  if (cameraSwitchJustPressed()) return false;
  if (cam.ready) showVideo = !showVideo;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

# ml5 BodyPose

## What it does

Finds a body with the BlazePose model and draws its 33-point skeleton. It reports whether each wrist is raised above its shoulder.

## Key data

- `poses`: ml5's results. Each pose has `keypoints` (33 × `{ x, y, confidence, name }` in video pixels), `keypoints3D`, and each keypoint by name (`pose.left_wrist`).
- `connections`: pairs of keypoint indices for drawing the skeleton, from `bodyPose.getSkeleton()`.
- `leftArmUp`, `rightArmUp`: true when that wrist's `y` is above its shoulder's. Each side only counts when both points have `confidence` above `CONFIDENCE` (0.3).

Indices: 0 nose, 11/12 shoulders, 13/14 elbows, 15/16 wrists, 23/24 hips, 25/26 knees, 27/28 ankles. Odd numbers are the person's left side.

## Desktop

- Any current browser with a webcam, on `https` or `localhost`.
- Step back from the laptop so your upper body is in view.
- `modelType: 'lite'` is the fastest model. Try `'full'` or `'heavy'` on a fast machine.

## Phone

- Uses the front camera. The rear camera works well for tracking someone else.
- Prop the phone up a few steps away.
- About 12 MB of model and wasm files on first load with `modelType: 'lite'` (the heavy model adds 27 MB). Use Wi‑Fi.

## Library and docs links

- Adapted from p5-phone's [PHONE_BodyPose_two_points](https://github.com/npuckett/p5-phone/tree/main/examples/ml5/PHONE_BodyPose_two_points).
- [ml5 bodyPose reference](https://docs.ml5js.org/#/reference/bodypose)

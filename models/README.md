# models/

Model files served from the same site as the examples. Browsers only load models from another site if that site sends CORS headers, and GitHub release downloads don't. So the YOLO files the examples use are copied here.

| File | Task | Size | Used by |
| --- | --- | --- | --- |
| `yolo26n.onnx` | detect (80 COCO classes) | 9.9 MB | yolo-detect, yolo-custom, yolo-in-space |
| `yolo26n-seg.onnx` | instance segmentation | 11.2 MB | yolo-segment |
| `yolo26n-pose.onnx` | pose (17 keypoints) | 12.1 MB | yolo-pose |

- Source: the official [Ultralytics assets release v8.4.0](https://github.com/ultralytics/assets/releases/tag/v8.4.0), unchanged. Each file carries the Ultralytics metadata (task, class names, input size) that `@ultralytics/yolo` requires.
- License: AGPL-3.0 (Ultralytics). See the top-level README.
- The same release also has `yolo26n-cls.onnx`, `-obb`, `-depth`, `-sem` and the larger `s`/`m`/`l`/`x` sizes. Download any of them here to try them with [yolo-custom](../p5/detection/yolo-custom/).

## Adding your own model

Export with Ultralytics 8.4.142 or later (`YOLO("best.pt").export(format="onnx")`), put the `.onnx` here, and point `MODEL_URL` at it. The steps are in [yolo-custom](../p5/detection/yolo-custom/README.md).

Other examples load their models straight from the publisher, which allows cross-origin loading:

- MediaPipe from `storage.googleapis.com`
- Transformers.js models from `huggingface.co`
- ml5 models from jsDelivr and TensorFlow Hub

To run fully offline or on a locked-down network, download those files here too and change the URLs in the sketches.

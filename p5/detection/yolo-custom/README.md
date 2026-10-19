# YOLO custom model

## What it does

A template for running a YOLO model you trained yourself. The sketch reads the task (detect, segment, pose, classify or obb) and the class names from inside the `.onnx` file and draws the right kind of result. Load a model from a URL, or pick a file with the **Load .onnx** button. A picked file stays in the browser and is never uploaded.

It starts with the standard `yolo26n.onnx`, so it runs before you have a model of your own.

## Key data

- `modelInfo`: `{ task, names, device }`, read once after loading.
- `results.boxes` (detect, segment, pose): `[{ x1, y1, x2, y2, conf, cls, name, color }]` in video pixels.
- `results.obb` (oriented boxes): `[{ x, y, w, h, angle, conf, name, color }]`, centered, with `angle` in radians.
- `results.probs` (classify): `{ top1, top1conf, top5, top5conf, name, top5names }`.
- `startYolo(source)`: loads a model from a URL string or a File. It waits for any running prediction, then frees the old model.

## Train and export a model (Google Colab)

1. **Collect and label images.** Photograph your objects from many angles, in different light, at the distance you'll use them. A few hundred labelled images is a reasonable start. Label them in [Roboflow](https://roboflow.com), [CVAT](https://www.cvat.ai) or [Label Studio](https://labelstud.io), and export in **YOLO** format. The export is a folder of images and labels plus a `data.yaml` that lists your class names.
2. **Open a Colab notebook with a GPU** (Runtime → Change runtime type → GPU). The official [Ultralytics tutorial notebook](https://colab.research.google.com/github/ultralytics/ultralytics/blob/main/examples/tutorial.ipynb) is a good starting point.
3. **Train**, starting from the pretrained nano model:
   ```python
   !pip install "ultralytics>=8.4.142"
   from ultralytics import YOLO

   model = YOLO("yolo26n.pt")            # yolo26n-seg.pt / -pose.pt / -cls.pt for other tasks
   model.train(data="/content/my-dataset/data.yaml", epochs=50, imgsz=640)
   ```
4. **Export to ONNX** from the best weights:
   ```python
   best = YOLO("runs/detect/train/weights/best.pt")
   best.export(format="onnx")                 # FP32
   best.export(format="onnx", quantize=16)    # FP16, about half the size
   ```
   Use Ultralytics **8.4.142 or later**. The export embeds the task, the class names and the input size in the file, and the web library refuses files that lack them. Smaller input sizes run faster on phones, but you must train at the same size: for example, `imgsz=320` in both `train()` and `export()`.
5. **Download** `best.onnx` from Colab's file panel and either:
   - pick it with **Load .onnx** to try it right away, or
   - copy it into `models/` and set `MODEL_URL` in `sketch.js`. Host it on the same site as the sketch: GitHub release links and most file-sharing links send no CORS headers, so browsers refuse to load them.

## Desktop

- WebGPU in Chrome and Edge, with a CPU fallback elsewhere.
- Training happens in Colab, not in the browser.

## Phone

- **Load .onnx** opens the phone's file picker, so you can AirDrop or download a model and try it without hosting.
- Keep custom models small (nano, 320–640 px input) for phones.
- The ONNX Runtime download (about 6 MB compressed) happens once per 8 hours.

## Library and docs links

- [@ultralytics/yolo for the web](https://github.com/ultralytics/inference/tree/main/web)
- [Ultralytics train mode](https://docs.ultralytics.com/modes/train/) and [export mode](https://docs.ultralytics.com/modes/export/)
- [Dataset format for detection](https://docs.ultralytics.com/datasets/detect/)
- **License:** Ultralytics models and the library are AGPL-3.0, and that includes models you train from their weights. See [yolo-detect](../yolo-detect/README.md#library-and-docs-links).

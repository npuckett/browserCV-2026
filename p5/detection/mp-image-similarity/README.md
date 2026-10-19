# MediaPipe image similarity

## What it does

Save up to three reference views (a mug, a plant, a book) by tapping the slots at the bottom. The sketch then scores the live camera view against each one and highlights the closest match. It needs no training: MediaPipe's ImageEmbedder turns each image into a list of numbers, and similar images get similar numbers.

## Key data

- `liveEmbedding`: `embedder.embedForVideo(video, timestamp).embeddings[0]`, an object with `floatEmbedding` (1024 numbers for mobilenet_v3_small).
- `slots`: up to three `{ thumbnail, embedding }` saved views.
- `similarities`: `ImageEmbedder.cosineSimilarity(liveEmbedding, slot.embedding)` for each slot. It runs from about 0 (unrelated) to 1 (the same image). `cosineSimilarity()` takes the embedding **objects**, not the number arrays.
- `bestSlot`: the most similar slot above `MATCH_THRESHOLD` (0.6), or -1.

Embeddings capture overall appearance, including background and lighting. Save references in the place where you'll use them, and fill the frame with the object.

## Desktop

- Any browser with WebGL2.
- Press 1, 2 or 3 to save the current view into a slot.

## Phone

- Starts on the rear camera, which suits pointing at objects.
- Tap a slot to save the current view.
- A 4 MB model plus the MediaPipe wasm, which makes it the lightest MediaPipe example here.
- Embedding runs in a few milliseconds even on older phones.

## Library and docs links

- MediaPipe loading pattern after **Golan Levin**'s [mediapipe_2026!](https://editor.p5js.org/golan/sketches/0XkgzZGe8) (dynamic `import()` from a plain p5 sketch). His MediaPipe sketches are listed with credits in [p5 MediaPipe by Golan Levin](../../mediapipe-golan-levin/).
- [MediaPipe Image Embedder for web](https://ai.google.dev/edge/mediapipe/solutions/vision/image_embedder/web_js)
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision), pinned to 1.1.0.
- For a larger, more accurate embedding, use `mobilenet_v3_large` (11 MB) in `MODEL_URL`.

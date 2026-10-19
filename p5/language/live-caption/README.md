# Live caption

## What it does

A vision-language model looks at the camera and writes about it: a description, what someone is doing, the colors, or a short poem. Tap to switch questions. It uses Apple's FastVLM (0.5B parameters) through Transformers.js and WebGPU, entirely in the browser. Each caption takes a second or two, so it suits slow, descriptive pieces, not tracking.

Examples from testing (M-series Mac, Chrome, WebGPU):

- "A brown cat with white whiskers is laying on its side, looking up at the camera." (1.3 s)
- "A blue and white bus with the words "cero emisiones" on its side is parked at a bus stop, where several people are waiting to board or alight from it." (2.1 s)

## Key data

- `lastCaption`: the last finished caption, shown large.
- `caption`: the caption being written now, which grows as `TextStreamer` hands over each new piece of text.
- `secondsPerCaption`: how long the last caption took.
- `PROMPTS`: the questions. Edit them freely. `MAX_NEW_TOKENS` (60) caps the length, and `PAUSE_MS` adds a rest between captions.

How a caption is made:

```js
const messages = [
  { role: 'system', content: 'You are a helpful visual assistant. Answer briefly.' },
  { role: 'user', content: '<image>' + question }        // <image> marks where the picture goes
];
const chat = processor.apply_chat_template(messages, { add_generation_prompt: true });
const inputs = await processor(rawImage, chat, { add_special_tokens: false });
await vlm.generate({ ...inputs, max_new_tokens: 60, do_sample: false, streamer });
```

The model is loaded in three parts with different precisions: `embed_tokens: 'fp16'`, `vision_encoder: 'fp16'`, `decoder_model_merged: 'q4f16'`. That totals **about 770 MB**.

## Desktop

- Chrome or Edge with WebGPU. The GPU must support 16-bit floats (`shader-f16`), which most do. Otherwise the sketch explains that it can't run.
- The download starts only after you tap to confirm. The browser caches it, so later visits load in seconds.
- 1–2 seconds per caption on an M-series Mac.

## Phone

- Experimental. It needs WebGPU with `shader-f16` (iOS 26 Safari, recent Android Chrome) and enough memory for a roughly 770 MB model. On many phones the tab will run out of memory or be very slow.
- Download on Wi‑Fi only.
- For phones, [ask-the-camera](../ask-the-camera/) doesn't help (desktop Chrome only). The smaller detectors in `p5/detection/` are the practical choice.

## Library and docs links

- [Transformers.js](https://huggingface.co/docs/transformers.js) 4.3.1: `AutoProcessor`, `AutoModelForImageTextToText`, `TextStreamer`, `RawImage`.
- Model: [onnx-community/FastVLM-0.5B-ONNX](https://huggingface.co/onnx-community/FastVLM-0.5B-ONNX) ([FastVLM paper](https://machinelearning.apple.com/research/fast-vision-language-models)).
- **License:** FastVLM's weights use Apple's Machine Learning Research Model License (`apple-amlr`), which covers research use. Read it before using the model in other work.
- Reference demo: [apple/fastvlm-webgpu](https://huggingface.co/spaces/apple/fastvlm-webgpu).
- A smaller alternative: [LFM2-VL 450M](https://huggingface.co/onnx-community/LFM2-VL-450M-ONNX) (about 550 MB, [WebGPU demo](https://huggingface.co/spaces/KCBF/LFM2-VL-WebGPU)). It uses a different chat format: `content: [{ type: 'image' }, { type: 'text', text }]`.

# Ask the camera

## What it does

Type a question ("What am I holding?", "Is the plant healthy?", "Read the sign") and the sketch sends it to Chrome's built-in language model along with the current camera frame. The answer streams in below. The model (Gemini Nano) runs on your computer, so nothing is uploaded and there's no API key.

**Desktop Chrome only.** Everywhere else, the sketch explains why it can't run.

## Key data

- `availability`: from `LanguageModel.availability(MODEL_OPTIONS)`. One of `'unavailable'`, `'downloadable'`, `'downloading'` or `'available'`.
- `session`: created by `LanguageModel.create()` on your first question. It has to be created from a click, because Chrome may need to download the model (a few GB) first, and that requires a user gesture.
- `answer`: the reply, built up from `session.promptStreaming()`.

Sending an image: images go in the message content next to the text, and a `<video>` element sends its current frame.

```js
const MODEL_OPTIONS = {
  expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
  expectedOutputs: [{ type: 'text', languages: ['en'] }]
};
session.promptStreaming([{ role: 'user', content: [
  { type: 'text', value: question },
  { type: 'image', value: cam.videoElement }
]}]);
```

The sketch uses `lockGestures({ mode: 'embedded', element: canvas.elt })`. Plain `lockGestures()` stops the text field from taking focus.

## Desktop

- **Chrome 148 or later** on Windows 10/11, macOS 13+, Linux or Chromebook Plus.
- Hardware: about 22 GB of free disk space, plus either a GPU with more than 4 GB of memory, or 16 GB of RAM and 4 CPU cores.
- The first question downloads the model, with a progress bar. Later visits start at once.
- Must run on its own page (GitHub Pages or localhost). Cross-origin iframes need `allow="language-model"`, which the p5.js Web Editor's preview doesn't grant.
- **Testing note:** in this repo's test browser, `availability()` returned `'downloadable'` with these options. The model download and the image prompt itself were not run, because that would install a multi-gigabyte model.

## Phone

- Not available. The Prompt API doesn't exist on Android or iOS. The sketch shows an explanation instead.
- For a vision-language model that runs in other browsers, see [live-caption](../live-caption/).

## Library and docs links

- [Prompt API documentation](https://developer.chrome.com/docs/ai/prompt-api), with the [multimodal input section](https://developer.chrome.com/docs/ai/prompt-api#multimodal_capabilities).
- [Prompt API explainer](https://github.com/webmachinelearning/prompt-api)
- Check model status in Chrome at `chrome://on-device-internals`.

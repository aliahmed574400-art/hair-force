import assert from "node:assert/strict";
import {
  buildPollinationsInpaintPayload,
  buildHaircutPrompt,
  getPollinationsImageModel,
  toGeneratedImageUrl
} from "../lib/ai-haircut-request.mjs";

process.env.POLLINATIONS_API_KEY = "sk_test_hairforce";
delete process.env.POLLINATIONS_IMAGE_MODEL;

const style = {
  label: "Buzz cut",
  prompt: "a clean buzz cut with very short, even hair all around"
};

assert.equal(getPollinationsImageModel(), "flux");

process.env.POLLINATIONS_IMAGE_MODEL = "kontext";
assert.equal(getPollinationsImageModel(), "kontext");

const prompt = buildHaircutPrompt(style);
assert.match(prompt, /Portrait photo\. ONLY CHANGE THE HAIR to a clean buzz cut/i);
assert.match(prompt, /KEEP THESE UNCHANGED:/);
assert.match(prompt, /Face shape and all facial features/i);
assert.match(prompt, /Original hair color/i);
assert.match(prompt, /Natural hairline blending/i);
assert.match(prompt, /Do NOT: change face/i);

delete process.env.POLLINATIONS_IMAGE_MODEL;
const inpaintPayload = buildPollinationsInpaintPayload({
  style,
  originalImage: "data:image/png;base64,b3JpZ2luYWw=",
  mask: "data:image/png;base64,bWFzaw==",
  width: 512,
  height: 384
});

assert.equal(inpaintPayload.model, "flux");
assert.equal(inpaintPayload.init_image, "data:image/png;base64,b3JpZ2luYWw=");
assert.equal(inpaintPayload.mask, "data:image/png;base64,bWFzaw==");
assert.equal(inpaintPayload.width, 512);
assert.equal(inpaintPayload.height, 384);
assert.equal(inpaintPayload.size, "512x384");
assert.equal(inpaintPayload.strength, 0.95);
assert.equal(inpaintPayload.steps, 30);
assert.equal(inpaintPayload.guidance_scale, 7.5);
assert.equal(inpaintPayload.n, 1);
assert.equal(inpaintPayload.response_format, "b64_json");

assert.equal(
  toGeneratedImageUrl({
    image_url: "https://example.com/pollinations-result.png"
  }),
  "https://example.com/pollinations-result.png"
);

assert.equal(
  toGeneratedImageUrl({
    data: [
      {
        b64_json: "aGFpcmZvcmNl"
      }
    ]
  }),
  "data:image/png;base64,aGFpcmZvcmNl"
);

assert.equal(
  toGeneratedImageUrl({
    data: [
      {
        url: "https://example.com/generated.png"
      }
    ]
  }),
  "https://example.com/generated.png"
);

console.log("ai haircut request checks passed");

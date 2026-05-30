export const DEFAULT_POLLINATIONS_IMAGE_MODEL = "flux";

export function getPollinationsImageModel() {
  return String(process.env.POLLINATIONS_IMAGE_MODEL || DEFAULT_POLLINATIONS_IMAGE_MODEL).trim();
}

export function buildHaircutPrompt(style) {
  const haircutDescription = style.description || style.prompt || style.label;

  return `
    Portrait photo. ONLY CHANGE THE HAIR to ${haircutDescription}.

    KEEP THESE UNCHANGED:
    - Face shape and all facial features
    - Eyes, eyebrows, eye color
    - Nose, nostrils, mouth, lips
    - Skin tone, skin texture
    - Head angle, head position
    - Ears, neck, shoulders
    - Clothing, background

    New hair:
    - ${haircutDescription}
    - Original hair color
    - Photorealistic
    - Professional lighting matching face
    - Natural hairline blending

    Do NOT: change face, distort features, change skin, move eyes,
    change nose, change mouth, blur, low quality, artifacts
  `
    .trim()
    .replace(/\n\s+/g, " ");
}

export function buildPollinationsInpaintPayload({
  style,
  originalImage,
  mask,
  width,
  height
}) {
  return {
    prompt: buildHaircutPrompt(style),
    model: getPollinationsImageModel(),
    init_image: originalImage,
    mask,
    strength: 0.95,
    width,
    height,
    size: `${width}x${height}`,
    steps: 30,
    guidance_scale: 7.5,
    n: 1,
    quality: "medium",
    response_format: "b64_json",
    user: "hairforce-ai",
    seed: Math.floor(Math.random() * 10000)
  };
}

export function getImageProviderError(payload, fallback) {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (typeof payload?.error === "string") {
    return payload.error;
  }

  if (typeof payload?.message === "string") {
    return payload.message;
  }

  return fallback;
}

export function toGeneratedImageUrl(payload) {
  if (payload?.image_url) {
    return payload.image_url;
  }

  if (payload?.image) {
    return payload.image;
  }

  if (payload?.url) {
    return payload.url;
  }

  const image = payload?.data?.[0];

  if (image?.b64_json) {
    return `data:image/png;base64,${image.b64_json}`;
  }

  if (image?.url) {
    return image.url;
  }

  return "";
}

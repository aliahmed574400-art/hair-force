import { findHaircutStyle } from "@/lib/haircut-styles";

export const runtime = "nodejs";
export const maxDuration = 120;

const COMFYUI_URL = process.env.COMFYUI_URL;

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");

  if (!meta || !base64) {
    throw new Error("Invalid image data URL.");
  }

  const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
  const bytes = Buffer.from(base64, "base64");

  return new Blob([bytes], { type: mime });
}

async function uploadToComfy(dataUrl, filename) {
  const formData = new FormData();

  formData.append("image", dataUrlToBlob(dataUrl), filename);
  formData.append("type", "input");
  formData.append("overwrite", "true");

  const res = await fetch(`${COMFYUI_URL}/upload/image`, {
    method: "POST",
    headers: {
      "ngrok-skip-browser-warning": "true"
    },
    body: formData
  });

  const text = await res.text();

  if (!res.ok) {
    console.log("ComfyUI upload failed:", res.status, text);
    throw new Error(`Could not upload image to ComfyUI. Status: ${res.status}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("ComfyUI upload returned invalid JSON.");
  }
}

async function waitForResult(promptId) {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    const data = await res.json();

    const item = data[promptId];

    if (item?.outputs?.["163"]?.images?.[0]) {
      return item.outputs["163"].images[0];
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("ComfyUI took too long.");
}

export async function POST(request) {
  try {
    if (!COMFYUI_URL) {
      return Response.json({ error: "Missing COMFYUI_URL in .env.local" }, { status: 500 });
    }

    const payload = await request.json();

    const originalImage = String(payload.originalImage || "");
    const styleId = String(payload.style || "");
    const style = findHaircutStyle(styleId);

    if (!style) {
      return Response.json({ error: "Invalid haircut style." }, { status: 400 });
    }

    if (!originalImage.startsWith("data:image/")) {
      return Response.json({ error: "Upload an image first." }, { status: 400 });
    }

    const uploaded = await uploadToComfy(originalImage, "hairforce-input.png");

    const workflow = {
      "3": {
        inputs: {
          seed: Math.floor(Math.random() * 999999999),
          steps: 20,
          cfg: 2.5,
          sampler_name: "euler",
          scheduler: "simple",
          denoise: 0.55,
          model: ["66", 0],
          positive: ["108", 0],
          negative: ["108", 1],
          latent_image: ["122", 0]
        },
        class_type: "KSampler"
      },
      "6": {
        inputs: {
          text: `Realistic professional barber haircut. Change only the hair to ${style.label}. ${style.helper || ""}. Keep the exact same person, same face, same skin, same clothes, same pose, same background. Natural hair texture, realistic fade, photorealistic.`,
          clip: ["38", 0]
        },
        class_type: "CLIPTextEncode"
      },
      "7": {
        inputs: {
          text: "different person, changed face, changed eyes, changed nose, changed jaw, changed clothes, changed background, cartoon, blurry, fake hair, low quality",
          clip: ["38", 0]
        },
        class_type: "CLIPTextEncode"
      },
      "8": {
        inputs: { samples: ["3", 0], vae: ["39", 0] },
        class_type: "VAEDecode"
      },
      "37": {
        inputs: {
          unet_name: "qwen_image_fp8_e4m3fn.safetensors",
          weight_dtype: "default"
        },
        class_type: "UNETLoader"
      },
      "38": {
        inputs: {
          clip_name: "qwen_2.5_vl_7b_fp8_scaled.safetensors",
          type: "qwen_image",
          device: "default"
        },
        class_type: "CLIPLoader"
      },
      "39": {
        inputs: { vae_name: "qwen_image_vae.safetensors" },
        class_type: "VAELoader"
      },
      "66": {
        inputs: { shift: 3.1, model: ["37", 0] },
        class_type: "ModelSamplingAuraFlow"
      },
      "71": {
        inputs: { image: uploaded.name },
        class_type: "LoadImage"
      },
      "76": {
        inputs: { pixels: ["172", 0], vae: ["39", 0] },
        class_type: "VAEEncode"
      },
      "84": {
        inputs: {
          control_net_name: "Qwen-Image-InstantX-ControlNet-Inpainting.safetensors"
        },
        class_type: "ControlNetLoader"
      },
      "108": {
        inputs: {
          strength: 1,
          start_percent: 0,
          end_percent: 1,
          positive: ["6", 0],
          negative: ["7", 0],
          control_net: ["84", 0],
          vae: ["39", 0],
          image: ["172", 0],
          mask: ["121:253", 0]
        },
        class_type: "ControlNetInpaintingAliMamaApply"
      },
      "122": {
        inputs: { samples: ["76", 0], mask: ["121:253", 0] },
        class_type: "SetLatentNoiseMask"
      },
      "126": {
        inputs: {
          x: 0,
          y: 0,
          resize_source: false,
          destination: ["172", 0],
          source: ["8", 0],
          mask: ["121:253", 0]
        },
        class_type: "ImageCompositeMasked"
      },
      "163": {
        inputs: {
          filename_prefix: "hairforce",
          images: ["126", 0]
        },
        class_type: "SaveImage"
      },
      "172": {
        inputs: {
          upscale_method: "area",
          largest_size: 1536,
          image: ["71", 0]
        },
        class_type: "ImageScaleToMaxDimension"
      },
      "121:253": {
        inputs: {
          channel: "red",
          image: ["121:252", 0]
        },
        class_type: "ImageToMask"
      },
      "121:251": {
        inputs: { mask: ["121:199", 0] },
        class_type: "MaskToImage"
      },
      "121:199": {
        inputs: {
          expand: 0,
          tapered_corners: true,
          mask: ["71", 1]
        },
        class_type: "GrowMask"
      },
      "121:252": {
        inputs: {
          blur_radius: 31,
          sigma: 1,
          image: ["121:251", 0]
        },
        class_type: "ImageBlur"
      }
    };

    const queueRes = await fetch(`${COMFYUI_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow })
    });

    const queueData = await queueRes.json();

    if (!queueRes.ok) {
      return Response.json({ error: queueData?.error || "ComfyUI queue failed." }, { status: 500 });
    }

    const image = await waitForResult(queueData.prompt_id);

    const imageUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(
      image.filename
    )}&subfolder=${encodeURIComponent(image.subfolder || "")}&type=${encodeURIComponent(
      image.type || "output"
    )}`;

    return Response.json({ imageUrl });
  } catch (error) {
    return Response.json(
      { error: error.message || "Unable to generate haircut." },
      { status: 500 }
    );
  }
}
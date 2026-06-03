/**
 * Client-side image compression and upload validation utilities.
 *
 * Upload strategy (in priority order):
 * 1. Direct-to-Cloudinary signed upload — bypasses Next.js/Vercel limits entirely.
 *    Supports large HD images and videos (up to Cloudinary plan limits).
 * 2. Fallback via /api/uploads — files are compressed to stay under Vercel's
 *    4.5 MB serverless payload limit.
 */

const MAX_API_UPLOAD_BYTES = 4 * 1024 * 1024; // 4 MB safety margin under Vercel's 4.5 MB

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";

function getCloudinaryUploadUrl(cloudName) {
  return `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
}

/**
 * Check whether Cloudinary direct upload is available.
 * @returns {boolean}
 */
export function isCloudinaryDirectUploadAvailable() {
  return Boolean(CLOUDINARY_CLOUD_NAME);
}

/**
 * Compress and resize an image file using a canvas.
 * @param {File} file
 * @param {object} options
 * @param {number} [options.maxWidth=1920]
 * @param {number} [options.maxHeight=1920]
 * @param {number} [options.quality=0.85]
 * @param {string} [options.outputType="image/jpeg"]
 * @returns {Promise<Blob>}
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    outputType = "image/jpeg"
  } = options;

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = image;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Unable to compress image."));
        return;
      }

      ctx.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Image compression failed."));
            return;
          }
          resolve(blob);
        },
        outputType,
        quality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image file."));
    };

    image.src = url;
  });
}

/**
 * Convert a Blob back to a File with the original name.
 * @param {Blob} blob
 * @param {string} originalName
 * @param {string} [type]
 * @returns {File}
 */
export function blobToFile(blob, originalName, type) {
  const ext = type === "image/webp" ? ".webp" : ".jpg";
  const baseName = originalName.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}${ext}`, { type: type || blob.type || "image/jpeg" });
}

/**
 * Prepare an image file for API-route upload: compress if needed and validate size.
 * @param {File} file
 * @param {object} options
 * @returns {Promise<File>}
 */
export async function prepareImageForApiUpload(file, options = {}) {
  const isImage = file.type?.startsWith("image/");

  if (!isImage) {
    if (file.size > MAX_API_UPLOAD_BYTES) {
      throw new Error(
        `Files must be ${formatFileSize(MAX_API_UPLOAD_BYTES)} or smaller. ` +
          `Enable Cloudinary for larger uploads.`
      );
    }
    return file;
  }

  // Compress all images before API upload to stay well under the limit
  const compressedBlob = await compressImage(file, options);
  const preparedFile = blobToFile(compressedBlob, file.name, compressedBlob.type);

  if (preparedFile.size > MAX_API_UPLOAD_BYTES) {
    throw new Error(
      `Image is still too large after compression (${formatFileSize(preparedFile.size)}). ` +
        `Please choose a smaller image or enable Cloudinary for large uploads.`
    );
  }

  return preparedFile;
}

/**
 * Upload a file directly to Cloudinary using a signed upload.
 * This bypasses the Next.js server entirely — no Vercel size limits.
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<string>} The Cloudinary secure URL
 */
export async function uploadDirectToCloudinary(file, folder = "general") {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error("Cloudinary is not configured.");
  }

  // 1. Get signed upload params from our API
  const sigResponse = await fetch(`/api/uploads/signature?folder=${encodeURIComponent(folder)}`, {
    credentials: "include"
  });

  if (!sigResponse.ok) {
    const errorData = await sigResponse.json().catch(() => ({}));
    console.error("[Cloudinary] Signature request failed:", sigResponse.status, errorData);
    throw new Error(errorData.error || "Unable to get upload signature.");
  }

  const sig = await sigResponse.json();

  // 2. Upload directly to Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("folder", sig.folder);

  const uploadResponse = await fetch(getCloudinaryUploadUrl(sig.cloudName), {
    method: "POST",
    body: formData
  });

  if (!uploadResponse.ok) {
    let errorMessage = "Cloudinary upload failed.";
    try {
      const errorData = await uploadResponse.json();
      errorMessage = errorData.error?.message || errorData.error || JSON.stringify(errorData);
    } catch {
      errorMessage = await uploadResponse.text().catch(() => "Cloudinary upload failed.");
    }
    console.error("[Cloudinary] Upload failed:", uploadResponse.status, errorMessage);
    throw new Error(errorMessage);
  }

  const result = await uploadResponse.json();

  if (!result.secure_url) {
    throw new Error("Upload succeeded but no URL was returned.");
  }

  console.log("[Cloudinary] Upload success:", result.secure_url);
  return result.secure_url;
}

/**
 * Upload a file using the best available strategy.
 * Prefers Cloudinary direct upload when configured, otherwise falls back
 * to the compressed /api/uploads route.
 * @param {File} file
 * @param {string} folder
 * @returns {Promise<string>} The uploaded file URL
 */
export async function uploadFile(file, folder = "general") {
  // Try Cloudinary direct upload first (bypasses Vercel limits)
  if (isCloudinaryDirectUploadAvailable()) {
    try {
      const url = await uploadDirectToCloudinary(file, folder);
      if (url) return url;
    } catch (error) {
      // If it's a network/CORS failure, log it and fall back to API upload
      const isNetworkError =
        error.message === "Failed to fetch" ||
        /networkerror|failed to fetch|cors|abort/i.test(error.message);

      if (isNetworkError) {
        console.warn(
          `[Cloudinary] Direct upload blocked (likely CORS/ad-blocker). ` +
            `Falling back to API upload with 4MB limit.`,
          error.message
        );
      } else {
        // For other Cloudinary errors (invalid signature, etc.), still try fallback
        console.warn(
          `[Cloudinary] Direct upload failed, falling back to API upload:`,
          error.message
        );
      }
    }
  }

  // Fallback: compress and upload through Next.js API (4MB limit)
  const preparedFile = await prepareImageForApiUpload(file);

  const payload = new FormData();
  payload.append("file", preparedFile);
  payload.append("folder", folder);

  const response = await fetch("/api/uploads", {
    method: "POST",
    body: payload
  });

  if (!response.ok) {
    throw await errorFromResponse(response, "Upload failed.");
  }

  const parsed = await safeParseResponse(response);
  return parsed.data?.url;
}

/**
 * Format bytes to human readable string.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Parse a fetch response safely, handling non-JSON error bodies (e.g. 413 from Vercel).
 * @param {Response} response
 * @returns {Promise<{ok: boolean, status: number, data?: any, text?: string}>}
 */
export async function safeParseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  }

  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

/**
 * Create a user-friendly error message from a fetch response.
 * @param {Response} response
 * @param {string} fallbackMessage
 * @returns {Promise<Error>}
 */
export async function errorFromResponse(response, fallbackMessage = "Request failed.") {
  const parsed = await safeParseResponse(response);

  if (
    parsed.status === 413 ||
    (parsed.text && /entity too large/i.test(parsed.text))
  ) {
    return new Error(
      `File too large. Please use an image under ${formatFileSize(MAX_API_UPLOAD_BYTES)} ` +
        `or enable Cloudinary for large uploads.`
    );
  }

  const message = parsed.data?.error || parsed.text || fallbackMessage;
  return new Error(message);
}

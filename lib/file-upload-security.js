import { NextResponse } from "next/server";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, "video/mp4", "video/quicktime"];
const ALLOWED_MEDIA_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ".mp4", ".mov"];
const MAX_IMAGE_SIZE = 4 * 1024 * 1024; // 4MB (safety margin under Vercel's 4.5MB serverless limit)
const MAX_MEDIA_SIZE = 4 * 1024 * 1024; // 4MB (same limit for all uploads on Vercel)

/**
 * Validate file upload
 * @param {File} file - The file to validate
 * @param {Object} options - Validation options
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateFileUpload(file, options = {}) {
  const {
    allowedTypes = ALLOWED_IMAGE_TYPES,
    allowedExtensions = ALLOWED_IMAGE_EXTENSIONS,
    maxSize = MAX_IMAGE_SIZE,
    name = "file"
  } = options;

  if (!file) {
    return { valid: false, error: `${name} is required.` };
  }

  // Check file size
  if (file.size > maxSize) {
    const sizeLimitMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `${name} must be smaller than ${sizeLimitMB}MB.`
    };
  }

  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `${name} type not allowed. Allowed types: ${allowedTypes.join(", ")}`
    };
  }

  // Check file extension
  const fileName = file.name || "";
  const extension = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
  
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `${name} extension not allowed. Allowed extensions: ${allowedExtensions.join(", ")}`
    };
  }

  return { valid: true };
}

/**
 * Get MIME type from file extension
 * @param {string} extension
 * @returns {string | null}
 */
export function getMimeTypeFromExtension(extension) {
  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime"
  };
  return mimeTypes[extension.toLowerCase()] || null;
}

/**
 * Sanitize file name
 * @param {string} fileName
 * @returns {string}
 */
export function sanitizeFileName(fileName) {
  // Remove potentially dangerous characters and path traversal attempts
  return fileName
    .replace(/\.\.\//g, "") // Remove path traversal
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Replace special characters
    .slice(0, 255); // Limit length
}

/**
 * Generate safe file name with timestamp
 * @param {string} originalName
 * @returns {string}
 */
export function generateSafeFileName(originalName) {
  const timestamp = Date.now();
  const extension = originalName.substring(originalName.lastIndexOf("."));
  const baseName = sanitizeFileName(originalName.substring(0, originalName.lastIndexOf(".")));
  return `${baseName}-${timestamp}${extension}`;
}

/**
 * Detect and prevent file type spoofing by checking magic bytes
 * @param {Buffer} buffer - File buffer
 * @param {string} declaredMimeType - Declared MIME type from file upload
 * @returns {boolean} - true if valid, false if spoofed
 */
export function validateFileMagic(buffer, declaredMimeType) {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  // Magic bytes (file signatures)
  const magics = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/gif": [0x47, 0x49, 0x46],
    "image/webp": [0x52, 0x49, 0x46, 0x46]
  };

  const expectedMagic = magics[declaredMimeType];
  if (!expectedMagic) {
    return false;
  }

  // Check if file starts with expected magic bytes
  for (let i = 0; i < expectedMagic.length; i++) {
    if (buffer[i] !== expectedMagic[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Middleware to validate image uploads
 * Usage: const validation = await validateImageUploadRequest(request);
 * @param {Request} request
 * @returns {Promise<{valid: boolean, error?: string, file?: File}>}
 */
export async function validateImageUploadRequest(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return { valid: false, error: "File is required." };
    }

    // Validate file
    const validation = validateFileUpload(file, {
      maxSize: MAX_IMAGE_SIZE
    });

    if (!validation.valid) {
      return validation;
    }

    // Check magic bytes to prevent file type spoofing
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    if (!validateFileMagic(uint8Array, file.type)) {
      return {
        valid: false,
        error: "File appears to be corrupted or spoofed."
      };
    }

    return { valid: true, file };
  } catch (error) {
    return { valid: false, error: "Failed to process file upload." };
  }
}

export async function validateMediaUploadRequest(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return { valid: false, error: "File is required." };
    }

    const validation = validateFileUpload(file, {
      allowedTypes: ALLOWED_MEDIA_TYPES,
      allowedExtensions: ALLOWED_MEDIA_EXTENSIONS,
      maxSize: MAX_MEDIA_SIZE
    });

    if (!validation.valid) {
      return validation;
    }

    if (file.type?.startsWith("image/")) {
      const buffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      if (!validateFileMagic(uint8Array, file.type)) {
        return {
          valid: false,
          error: "File appears to be corrupted or spoofed."
        };
      }
    }

    return { valid: true, file, formData };
  } catch (error) {
    return { valid: false, error: "Failed to process file upload." };
  }
}

/**
 * Response helper for file validation errors
 * @param {string} error
 * @returns {NextResponse}
 */
export function fileValidationErrorResponse(error) {
  return NextResponse.json({ error }, { status: 400 });
}

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";

const uploadRoot = path.join(process.cwd(), "public", "uploads");
const hasCloudinary =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

export async function ensureUploadDir(folder = "") {
  const targetDir = path.join(uploadRoot, folder);
  await fs.mkdir(targetDir, { recursive: true });
  return targetDir;
}

export async function saveUploadedFile(file, folder = "") {
  if (!file) {
    throw new Error("No file uploaded.");
  }

  const isImage = file.type?.startsWith("image/");
  const isVideo = file.type?.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Only image and video uploads are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (hasCloudinary) {
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: `hairforce/${folder || "general"}`,
      resource_type: "auto"
    });

    return result.secure_url;
  }

  const extension = path.extname(file.name || "") || ".png";
  const safeName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
  const targetDir = await ensureUploadDir(folder);
  const absolutePath = path.join(targetDir, safeName);

  await fs.writeFile(absolutePath, buffer);

  return `/uploads/${folder ? `${folder}/` : ""}${safeName}`;
}

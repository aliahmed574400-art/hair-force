import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/session";
import { v2 as cloudinary } from "cloudinary";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "";
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "";

const hasCloudinary =
  Boolean(CLOUDINARY_CLOUD_NAME) &&
  Boolean(CLOUDINARY_API_KEY) &&
  Boolean(CLOUDINARY_API_SECRET);

if (hasCloudinary) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
}

export async function GET(request) {
  const user = await getSessionFromRequest(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!hasCloudinary) {
    return NextResponse.json(
      { error: "Cloudinary is not configured." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const folder = searchParams.get("folder") || "general";

  // SECURITY: Validate folder name to prevent path traversal
  const validFolders = [
    "general",
    "profile",
    "gallery",
    "cover",
    "covers",
    "avatars",
    "services",
    "portfolio",
    "products",
    "messages"
  ];
  const safeFolder = validFolders.includes(folder) ? folder : "general";

  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    timestamp,
    folder: `hairforce/${safeFolder}`
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    CLOUDINARY_API_SECRET
  );

  return NextResponse.json({
    signature,
    timestamp,
    apiKey: CLOUDINARY_API_KEY,
    cloudName: CLOUDINARY_CLOUD_NAME,
    folder: `hairforce/${safeFolder}`
  });
}

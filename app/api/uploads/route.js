import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/uploads";
import { getSessionFromRequest } from "@/lib/session";
import { validateMediaUploadRequest, fileValidationErrorResponse } from "@/lib/file-upload-security";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const fileValidation = await validateMediaUploadRequest(request);
    if (!fileValidation.valid) {
      return fileValidationErrorResponse(fileValidation.error);
    }

    const formData = fileValidation.formData;
    const folder = String(formData.get("folder") || "general");

    // SECURITY: Validate folder name to prevent path traversal
    const validFolders = ["general", "profile", "gallery", "cover", "covers", "avatars", "services", "portfolio", "products"];
    const safeFolderName = validFolders.includes(folder) ? folder : "general";

    const url = await saveUploadedFile(fileValidation.file, safeFolderName);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload file." }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/uploads";
import { getSessionFromRequest } from "@/lib/session";
import { validateImageUploadRequest, fileValidationErrorResponse } from "@/lib/file-upload-security";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    // SECURITY: Validate file upload
    const fileValidation = await validateImageUploadRequest(request);
    if (!fileValidation.valid) {
      return fileValidationErrorResponse(fileValidation.error);
    }

    const formData = await request.formData();
    const folder = String(formData.get("folder") || "general");

    // SECURITY: Validate folder name to prevent path traversal
    const validFolders = ["general", "profile", "gallery", "cover"];
    const safeFolderName = validFolders.includes(folder) ? folder : "general";

    const url = await saveUploadedFile(fileValidation.file, safeFolderName);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: "Failed to upload file." }, { status: 400 });
  }
}

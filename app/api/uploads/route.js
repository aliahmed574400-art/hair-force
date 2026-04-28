import { NextResponse } from "next/server";
import { saveUploadedFile } from "@/lib/uploads";
import { getSessionFromRequest } from "@/lib/session";

export async function POST(request) {
  try {
    const user = await getSessionFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") || "general");

    const url = await saveUploadedFile(file, folder);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

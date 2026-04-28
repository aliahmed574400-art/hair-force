import { NextResponse } from "next/server";
import { signinWithGoogle } from "@/lib/postgres-repositories";
import { applySessionCookie } from "@/lib/session";

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

function getGoogleProfileFromTokenInfo(tokenInfo) {
  if (!tokenInfo?.sub || !tokenInfo?.email) {
    throw new Error("Google did not return a usable account profile.");
  }

  if (tokenInfo.email_verified !== "true") {
    throw new Error("Please use a Google account with a verified email.");
  }

  if (tokenInfo.aud !== GOOGLE_CLIENT_ID) {
    throw new Error("Google sign in is configured with the wrong client ID.");
  }

  if (!["accounts.google.com", "https://accounts.google.com"].includes(tokenInfo.iss)) {
    throw new Error("Google sign in could not verify the token issuer.");
  }

  return {
    googleId: tokenInfo.sub,
    email: tokenInfo.email,
    name: tokenInfo.name || tokenInfo.email.split("@")[0],
    avatar: tokenInfo.picture || ""
  };
}

export async function POST(request) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json(
        { error: "Google sign in is not configured yet." },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const credential = String(payload.credential || "").trim();

    if (!credential) {
      return NextResponse.json(
        { error: "Google credential is required." },
        { status: 400 }
      );
    }

    const tokenInfoResponse = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: "no-store" }
    );

    if (!tokenInfoResponse.ok) {
      return NextResponse.json(
        { error: "Google could not verify this sign in attempt." },
        { status: 400 }
      );
    }

    const tokenInfo = await tokenInfoResponse.json();
    const googleProfile = getGoogleProfileFromTokenInfo(tokenInfo);
    const user = await signinWithGoogle(googleProfile);
    const response = NextResponse.json({ user });
    await applySessionCookie(response, user, request);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Google sign in failed." },
      { status: 400 }
    );
  }
}

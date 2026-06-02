import crypto from "crypto";
import fs from "node:fs";
import path from "node:path";

const DEV_SECRET_PATH = path.join(process.cwd(), ".dev-session-secret");

let cachedSecret = null;

function getSessionSecret() {
  if (cachedSecret) {
    return cachedSecret;
  }

  const envSecret = process.env.SESSION_SECRET;

  if (envSecret) {
    if (envSecret.length < 64) {
      throw new Error(
        "SESSION_SECRET must be at least 64 hex characters (32 bytes). " +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
      );
    }
    cachedSecret = envSecret;
    return cachedSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET environment variable is required in production. " +
        'Generate a 64-byte random string: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
    );
  }

  try {
    if (fs.existsSync(DEV_SECRET_PATH)) {
      const cached = fs.readFileSync(DEV_SECRET_PATH, "utf8").trim();
      if (cached.length >= 64) {
        cachedSecret = cached;
        return cachedSecret;
      }
    }
  } catch {
    // fall through to regenerate
  }

  const generated = crypto.randomBytes(64).toString("hex");
  try {
    fs.writeFileSync(DEV_SECRET_PATH, generated, { mode: 0o600 });
    console.warn("\n⚠️  WARNING: SESSION_SECRET not set. Generated dev secret in .dev-session-secret.");
    console.warn("   This is for local development only. Production requires SESSION_SECRET.\n");
  } catch {
    console.warn("\n⚠️  WARNING: SESSION_SECRET not set and could not write .dev-session-secret.");
    console.warn("   Sessions will be invalidated on server restart.\n");
  }
  cachedSecret = generated;
  return cachedSecret;
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function createCookiePayload(sessionId, verifier) {
  return {
    sessionId: String(sessionId || "").trim(),
    verifier: String(verifier || "").trim()
  };
}

export function createSignedSessionToken(sessionId, verifier) {
  const payload = JSON.stringify(createCookiePayload(sessionId, verifier));
  const encoded = encodeBase64Url(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }

  const [encoded, signature] = token.split(".");

  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(encoded));
    const sessionId = String(payload.sessionId || "").trim();
    const verifier = String(payload.verifier || "").trim();

    if (!sessionId || !verifier) {
      return null;
    }

    return {
      sessionId,
      verifier
    };
  } catch {
    return null;
  }
}

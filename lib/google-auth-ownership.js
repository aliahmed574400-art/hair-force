const ACCOUNT_ROLE_MESSAGES = {
  client:
    "This Google account is already linked to a stylist account. Delete that stylist account from the vendor dashboard before using Google for the client sign-in page.",
  vendor:
    "This Google account is already linked to a client account. Delete that client account from the client dashboard before using Google for a stylist account."
};

export function normalizeGoogleAuthAccountRole(value) {
  const normalizedValue = String(value || "")
    .trim()
    .toLowerCase();

  if (normalizedValue === "client") {
    return "client";
  }

  if (normalizedValue === "vendor" || normalizedValue === "stylist") {
    return "vendor";
  }

  return "";
}

export function isUserAllowedForGoogleAccountRole(user, accountRole) {
  const normalizedAccountRole = normalizeGoogleAuthAccountRole(accountRole);
  const userRole = String(user?.role || "")
    .trim()
    .toLowerCase();

  if (!normalizedAccountRole || !userRole) {
    return true;
  }

  if (userRole === "admin") {
    return true;
  }

  if (normalizedAccountRole === "client") {
    return userRole === "client";
  }

  if (normalizedAccountRole === "vendor") {
    return userRole === "vendor";
  }

  return true;
}

export function createGoogleAccountOwnershipError(accountRole) {
  const normalizedAccountRole = normalizeGoogleAuthAccountRole(accountRole);
  const error = new Error(
    ACCOUNT_ROLE_MESSAGES[normalizedAccountRole] || "This Google account is already linked to another Hair Force account."
  );

  error.status = 409;
  error.code = "AUTH_ACCOUNT_OWNERSHIP_CONFLICT";
  error.accountRole = normalizedAccountRole;
  return error;
}

export function assertGoogleAccountRoleOwnership(user, accountRole) {
  if (isUserAllowedForGoogleAccountRole(user, accountRole)) {
    return normalizeGoogleAuthAccountRole(accountRole);
  }

  throw createGoogleAccountOwnershipError(accountRole);
}

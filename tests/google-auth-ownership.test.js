import assert from "node:assert/strict";
import {
  assertGoogleAccountRoleOwnership,
  normalizeGoogleAuthAccountRole
} from "../lib/google-auth-ownership.js";

function expectError(fn, expectedMessage) {
  let didThrow = false;

  try {
    fn();
  } catch (error) {
    didThrow = true;
    assert.equal(error.message, expectedMessage);
  }

  assert.equal(didThrow, true, "Expected function to throw.");
}

assert.equal(normalizeGoogleAuthAccountRole("client"), "client");
assert.equal(normalizeGoogleAuthAccountRole("vendor"), "vendor");
assert.equal(normalizeGoogleAuthAccountRole("stylist"), "vendor");
assert.equal(normalizeGoogleAuthAccountRole(""), "");

assert.equal(assertGoogleAccountRoleOwnership({ role: "client" }, "client"), "client");
assert.equal(assertGoogleAccountRoleOwnership({ role: "vendor" }, "vendor"), "vendor");
assert.equal(assertGoogleAccountRoleOwnership({ role: "admin" }, "client"), "client");
assert.equal(assertGoogleAccountRoleOwnership({ role: "admin" }, "vendor"), "vendor");

expectError(
  () => assertGoogleAccountRoleOwnership({ role: "client" }, "vendor"),
  "This Google account is already linked to a client account. Delete that client account from the client dashboard before using Google for a stylist account."
);

expectError(
  () => assertGoogleAccountRoleOwnership({ role: "vendor" }, "client"),
  "This Google account is already linked to a stylist account. Delete that stylist account from the vendor dashboard before using Google for the client sign-in page."
);

console.log("google-auth-ownership checks passed");

// Auth-sessions repository facade — Phase 1 of the migration documented in
// ./README.md. This file currently forwards to the legacy implementations in
// lib/postgres-repositories.js. Phase 2 will move the bodies in here and
// split demo/postgres behind the facade.
//
// Consumers should import from this module rather than directly from
// lib/postgres-repositories.js so when Phase 2 lands the change is invisible.

import {
  createAuthSession as _createAuthSession,
  getUserByAuthSession as _getUserByAuthSession,
  revokeAuthSession as _revokeAuthSession
} from "@/lib/postgres-repositories";

/**
 * Repository for auth session lifecycle. Construct once at module load via
 * getAuthSessionsRepository() — there are no per-request resources.
 *
 * Methods:
 *   createSession(user, meta)        → { id, userId, verifier, ... }
 *   findUserBySession(sessionId, verifier, options)  → user | null
 *   revokeSession(user, sessionId)   → revoked session row | null
 */
function createAuthSessionsRepository() {
  return {
    createSession: _createAuthSession,
    findUserBySession: _getUserByAuthSession,
    revokeSession: _revokeAuthSession
  };
}

let singleton = null;

export function getAuthSessionsRepository() {
  if (!singleton) {
    singleton = createAuthSessionsRepository();
  }
  return singleton;
}

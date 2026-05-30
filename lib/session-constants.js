// Shared session constants. Lives in its own module to break the circular
// import that would exist if session.js imported from postgres-repositories.js
// (which in turn imports the DB row TTL).
//
// Cookie maxAge (lib/session.js) and DB auth_sessions row expiry
// (lib/postgres-repositories.js → createAuthSession) MUST stay in sync, so
// both files import this single value.

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

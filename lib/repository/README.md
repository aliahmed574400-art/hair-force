# Repository layer

This directory is the home for the **repository facade** — the intended
replacement for `lib/postgres-repositories.js`'s 7000-line file full of
`if (!hasDatabase) { demo } else { postgres }` branching.

## Why

Today every data function pays for the demo/Postgres split inline. That
means:

- A bug fixed on the Postgres side is silently missing from the demo side
  (and vice versa). `signinUser`'s timing-oracle fix is the canonical
  example — two near-identical bodies that need to evolve together.
- Per-function `if (!hasDatabase)` makes the call sites larger and the
  function bodies harder to read.
- It's impossible to swap backends (e.g. an in-memory test double) without
  patching the global env flag.

## The pattern

Each domain (auth sessions, vendor profiles, bookings, services, etc.) gets
its own file here, with three pieces:

```
lib/repository/
  README.md            ← this file
  auth-sessions.js     ← public facade for one domain
  ...                  ← (future) other domains
```

Each domain file exports:

1. A **single object** with all the operations for that domain.
2. The object is constructed by `createXxxRepository({ mode })` where `mode`
   is `"postgres"` or `"demo"` (detected from env).
3. Callers import `getXxxRepository()` and call methods on it — never
   reaching into the implementation directly.

## Migration approach (incremental, won't break anything)

The current code in `lib/postgres-repositories.js` keeps working. To migrate
a function over:

1. **Phase 1** — Add a thin re-export in the new domain file that just
   forwards to the existing `lib/postgres-repositories.js` export. Update
   one or two callers to import from the new module. Tests still pass.
2. **Phase 2** — Move the *real implementation* into the new module. Delete
   the old export. All callers now go through the facade.
3. **Phase 3** — Inside the facade, split the demo and postgres branches
   into separate small functions per `mode`. The facade picks one at
   construction time.

`auth-sessions.js` in this directory shows Phase 1. The session.js consumer
is updated to use the facade so the indirection is real (not just dead
re-exports waiting to be used). Repeat the same shape for the next domain.

## What NOT to do

- Don't migrate everything at once. The current dual-path code works; one
  domain at a time keeps reviewability tight.
- Don't introduce DI containers, class hierarchies, or factories-for-factories.
  Plain functions + plain objects, picked by a single env check.

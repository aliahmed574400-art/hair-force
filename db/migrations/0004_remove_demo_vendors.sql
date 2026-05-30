-- Remove seeded demo vendors from the old lib/data.js stylists array.
-- These were inserted into vendor_profiles during initial seeding.
-- ON DELETE CASCADE handles related services, bookings, favorites, etc.
DELETE FROM vendor_profiles
WHERE slug IN (
  'noor-atelier',
  'rayan-fade-club',
  'safa-skin-spa',
  'zoya-bridal-room',
  'muse-nail-lounge',
  'braid-boulevard'
);

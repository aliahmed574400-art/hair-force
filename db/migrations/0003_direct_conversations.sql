-- ============================================================================
-- Migration: Add support for direct (booking-less) conversations
-- ============================================================================

-- booking_conversations: make booking_id nullable and remove the old UNIQUE
-- constraint so multiple direct conversations (or one per client+vendor pair)
-- can exist.
ALTER TABLE booking_conversations
  ALTER COLUMN booking_id DROP NOT NULL;

-- Drop the old UNIQUE constraint on booking_id (if it exists as a named constraint)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_conversations_booking_id_key'
      AND conrelid = 'booking_conversations'::regclass
  ) THEN
    ALTER TABLE booking_conversations
      DROP CONSTRAINT booking_conversations_booking_id_key;
  END IF;
END $$;

-- Keep uniqueness for booking-linked conversations (one conv per booking)
CREATE UNIQUE INDEX IF NOT EXISTS booking_conversations_booking_id_unique_idx
  ON booking_conversations (booking_id)
  WHERE booking_id IS NOT NULL;

-- booking_messages: make booking_id nullable to match conversations
ALTER TABLE booking_messages
  ALTER COLUMN booking_id DROP NOT NULL;

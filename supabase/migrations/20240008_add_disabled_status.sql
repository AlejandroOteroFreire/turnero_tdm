-- Add 'disabled' value to account_status enum if not already present
ALTER TYPE account_status ADD VALUE IF NOT EXISTS 'disabled';

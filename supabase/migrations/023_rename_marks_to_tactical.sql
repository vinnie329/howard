-- Migration: rename book='marks' to book='tactical' on portfolio_positions.
-- The original naming (Buffett/Marks Book) was a placeholder; we're moving to
-- product-meaningful names (Tactical / Opportunistic + Compounder).

ALTER TABLE portfolio_positions DROP CONSTRAINT IF EXISTS portfolio_positions_book_check;

UPDATE portfolio_positions SET book = 'tactical' WHERE book = 'marks';

ALTER TABLE portfolio_positions
  ADD CONSTRAINT portfolio_positions_book_check
  CHECK (book IN ('tactical', 'core'));

ALTER TABLE portfolio_positions
  ALTER COLUMN book SET DEFAULT 'tactical';

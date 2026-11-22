-- Add the Professor's beginner-friendly review to the candidate record.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS educational_review jsonb;

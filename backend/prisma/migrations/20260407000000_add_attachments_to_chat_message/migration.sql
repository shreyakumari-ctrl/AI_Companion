-- Add optional attachments column to ChatMessage (stored as JSON text in SQLite)
ALTER TABLE "ChatMessage" ADD COLUMN "attachments" TEXT;

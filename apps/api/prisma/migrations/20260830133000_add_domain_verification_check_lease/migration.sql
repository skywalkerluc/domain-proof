ALTER TABLE "domain_verifications"
ADD COLUMN "check_started_at" TIMESTAMP(3);

UPDATE "domain_verifications"
SET "check_started_at" = "last_checked_at"
WHERE "last_checked_at" IS NOT NULL;

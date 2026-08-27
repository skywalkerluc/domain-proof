CREATE TYPE "DomainVerificationStatus" AS ENUM ('pending', 'verified');

CREATE TYPE "DomainVerificationCheckOutcome" AS ENUM (
  'verified',
  'record_not_found',
  'record_mismatch',
  'lookup_error'
);

ALTER TABLE "domain_verifications"
ADD COLUMN "status" "DomainVerificationStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "verified_at" TIMESTAMP(3),
ADD COLUMN "last_checked_at" TIMESTAMP(3),
ADD COLUMN "last_check_outcome" "DomainVerificationCheckOutcome";

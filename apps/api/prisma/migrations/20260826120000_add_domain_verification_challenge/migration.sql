CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE "domain_verifications"
ADD COLUMN "challenge_token" TEXT NOT NULL
DEFAULT translate(rtrim(encode(gen_random_bytes(32), 'base64'), '='), '+/', '-_');

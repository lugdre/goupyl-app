---
name: PARQ medical answers encryption secret
description: PARQ questionnaire answers are encrypted at rest with AES-256-GCM. The key is derived from PARQ_ENCRYPTION_KEY env var (falls back to JWT_ACCESS_SECRET) — rotating either rotates the cipher.
type: project
---

The `PARQQuestionnaire.answers` column stores an encrypted envelope `<iv>:<authTag>:<ciphertext>` (all base64) produced by `backend/src/utils/encryption.js`. The symmetric key is derived via scrypt from `PARQ_ENCRYPTION_KEY` if set, otherwise from `JWT_ACCESS_SECRET`.

**Why:** Backlog item GS-H1-08 requires that medical data is encrypted and never transmitted to employer/HR. Using a server-side derived key keeps deployment simple while avoiding plaintext-at-rest in the DB.

**How to apply:**
- If anyone changes `JWT_ACCESS_SECRET` without first setting an explicit `PARQ_ENCRYPTION_KEY`, all stored PARQ answers become undecryptable. Warn before such a rotation, or set `PARQ_ENCRYPTION_KEY` to the previous secret to preserve decryption.
- The salt is hardcoded (`goupyl-sport-parq-v1`). To migrate keys safely, you would need a re-encryption job that reads/writes via the service layer.
- Never expose the raw `answers` field through any API endpoint other than `GET /api/parq/me` (CLIENT owner only).

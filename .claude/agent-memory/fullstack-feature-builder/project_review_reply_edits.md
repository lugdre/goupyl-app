---
name: Review reply edit policy
description: Coach reply on a Review may be edited up to 3 times — limit lives in the service layer constant
type: project
---

A coach (INTERVENANT) can edit their reply to a client Review up to 3 times after the initial post.

**Why:** Allows coaches to refine wording/typos after publishing without enabling unlimited rewriting that would confuse readers of a public review thread. Limit enforced server-side to prevent client tampering.

**How to apply:**
- `Review.coachReplyEdits` (Int, default 0) tracks edits; only the *edits* are counted, not the original post (initial reply leaves it at 0).
- The limit constant `MAX_COACH_REPLY_EDITS = 3` is in `backend/src/services/review.service.js`. Update it there if the policy changes.
- The same `PUT /api/reviews/:id/reply` endpoint handles both initial reply and edits — the service detects which by checking whether `coachReply` is already set.
- Frontend (`frontend/src/pages/intervenant/MyReviews.jsx`) shows a "Modifier" button disabled once the counter reaches the limit, and displays remaining edits below the textarea while editing.
- Admin edit history viewing is a planned extension but not yet implemented.

# Devpost Submission Draft

**State:** Content prepared for review. It has not been entered or submitted in Devpost. Review the first-person answers and account-specific fields before using them.

## Project title

Limnim

## Elevator pitch

Turn hotel cancellation policies into evidence-backed guest answers.

## Short description

Limnim helps hotel front-desk teams answer cancellation questions without manually translating policy wording into amounts. Staff provide the policy and essential booking details; Limnim extracts explicit thresholds, checks each one against its exact source quote, and calculates the potential penalty and refund locally. A copyable reply includes the selected property-local time, amounts, relevant policy wording, and an estimate disclaimer.

The guest reply is built from validated rules and deterministic calculations, not another AI generation. Unclear boundaries, conflicts, and unsupported fees remain unresolved. Staff review and send the reply through their existing channel. Limnim does not connect to a PMS, message guests, sell or book services, cancel bookings, guarantee refunds, or determine legal rights. A later PMS integration could pair an answered question with a hotel-approved paid option such as late checkout after verifying its rules, availability, and price.

## What I learned — entrant review required

Draft: “The biggest lesson for me was that an extracted quote isn't enough on its own. I checked that the date, time, penalty, and booking scope match the evidence, then kept the financial math separate from the AI. When a policy doesn't say enough, showing the uncertainty is more useful than filling in the gaps.”

Use only if it reflects the entrant's actual experience.

## How I used the Devpost Learn Skill Pack — entrant review required

Draft: “I used the Devpost Learn Skill Pack to turn the idea into an approved scope, PRD, and technical spec before implementation. Those plans kept the prototype focused on one end-to-end hotel workflow, and I checked the finished behavior against the planned requirements and edge cases.”

Confirm that this accurately describes which skills were run and how they informed the project.

## Repository and try-it-out link

- Repository URL: <https://github.com/zalkabsi/limnim>
- Public `main` includes the audit fixes and sample-only Render configuration. The narrated preview remains local for entrant review and upload.
- “Try it out” field: use the same public repository URL as required by the published submission update.
- Deployment URL: <https://limnim-sample-demo.onrender.com>. It opens the fictional Tokyo sample and disables live analysis; no OpenAI key is required. The verified rules do not require a separate public website deployment. Local setup remains in [README.md](README.md).

## Video field

**Entrant review and publication pending.** A local-only narrated sample-mode preview is at `devpost/assets/limnim-demo-narrated.mp4`; it matches the public demo and uses fictional data without live extraction. The file is ignored by Git and has not been uploaded. Review the video and confirm it is suitable for the submission before publishing it to YouTube or Vimeo and entering its URL. Do not claim successful live extraction until a funded, authorized request has passed. See [DEMO_VIDEO_PLAN.md](DEMO_VIDEO_PLAN.md).

## Required account checks

- Verify eligibility and registration.
- Confirm the project is original and any pre-existing work is disclosed.
- Complete the age-of-majority checkbox.
- Review and save the Skill Pack answer above.
- Confirm the repository URL is in “Try it out.”
- Complete all other required Devpost fields and submit before October 26, 2026 at 5:00 PM EDT (October 27 at 12:00 AM Asia/Riyadh).

Do not claim live AI extraction works until a request has completed successfully with an authorized OpenAI account that has available credits. During this audit, the real API returned HTTP 429 `credit_balance_exhausted`.

# Devpost Entry Draft

## Project name

Limnim

## Elevator pitch

Turn hotel cancellation policies into evidence-backed guest answers.

## Project description

Limnim helps hotel front-desk teams answer cancellation questions without manually translating policy wording into amounts. Staff provide the policy and essential booking details; Limnim extracts explicit thresholds, checks each one against its exact source quote, and calculates the potential penalty and refund locally. A copyable reply includes the selected property-local time, amounts, relevant policy wording, and an estimate disclaimer.

The guest reply is built from validated rules and deterministic calculations, not another AI generation. Unclear boundaries, conflicts, and unsupported fees remain unresolved. Staff review and send the reply through their existing channel. Limnim does not connect to a PMS, message guests, sell or book services, cancel bookings, guarantee refunds, or determine legal rights. A later PMS integration could pair an answered question with a hotel-approved paid option such as late checkout after verifying its rules, availability, and price.

It is for hotel front-desk and guest-service teams that need to explain cancellation terms consistently.

## What I learned — personal draft

The biggest lesson for me was that an extracted quote isn't enough on its own. I checked that the date, time, boundary, penalty, and booking scope match the evidence, then kept the math and guest reply separate from AI generation. When a policy doesn't say enough, showing the uncertainty is more useful than filling in the gaps.

Review this paragraph before submitting so it reflects what you personally learned.

## How I used the Devpost Learn Skill Pack — personal draft

I used the Devpost Learn Skill Pack to turn the original idea into an approved scope, PRD, and technical spec before implementation. Those plans defined the cancellation-analysis workflow; the later staff-response extension builds on that same evidence and calculation path. I checked the finished behavior against the planned requirements and edge cases.

Review this answer before submitting so it matches how you used the Skill Pack.

## Project thumbnail

Use [`assets/limnim-thumbnail.png`](assets/limnim-thumbnail.png), a 1536 × 1024 PNG (3:2 ratio, 181,414 bytes), under Devpost's 5 MB limit.

## Demo video

Record the final live-extraction demo with `npm run demo:live`; the script writes the candidate to [`assets/limnim-demo-narrated.mp4`](assets/limnim-demo-narrated.mp4). Video production remains deferred until the application and submission materials are complete and a successful live extraction is available. Existing committed recordings predate the Limnim rebrand and must not be used as the final demo.

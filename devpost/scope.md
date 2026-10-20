---
doc: scope
status: approved
---

# Limnim

An AI-assisted hotel cancellation-policy tool that shows travelers how their potential refund changes over time.

## The Unique Kernel
Limnim turns policy language into an interactive financial timeline. AI extracts the cancellation rules; deterministic code calculates the outcome; each threshold can be traced to the original policy text.

## Who It's For
A traveler with a hotel reservation who is deciding whether to cancel now or wait. Today they have to parse the hotel's policy and work out the financial consequences themselves.

## The Core Loop
The traveler pastes a hotel cancellation policy and enters the booking amount, check-in details, and property time zone. Limnim analyzes the policy once, then lets them explore cancellation times on a stepped timeline and inspect the source text behind each result.

## Inspiration & Identity
A precise, trustworthy blend of financial analytics and premium travel software: warm neutral surfaces, dark readable type, teal accents, and a stepped timeline that distinguishes refunds from penalties without relying on color alone.

## Why This Matters to the Learner
The learner wants to make a working Limnim proof of concept for the Build With AI: Basics hackathon.

## What "Working" Looks Like
A traveler can use the sample Tokyo hotel policy, see the free-cancellation, 50%-penalty, and non-refundable periods, and select times before and after both deadlines. The displayed refund and penalty update correctly, and the traveler can inspect the supporting policy excerpts. A pasted policy can also go through live AI extraction, with uncertainty shown instead of hidden.

## The POC Boundary
The approved proof of concept is one end-to-end hotel workflow: pasted policy text, essential booking details, live extraction of free cancellation and percentage/non-refundable thresholds, validated structured rules, deterministic financial calculations, a sample booking, a stepped interactive timeline, and source evidence. Unsupported conditions remain unresolved and are clearly flagged.

## Later
- Text-based PDF upload.
- Fixed monetary fees, no-show terms, per-room rules, tax treatment, and other policy forms beyond the sample pattern.
- Comparing bookings, exporting a summary, and displaying deadlines in the user's local time.

## Explicitly Cut
- Flights, rental cars, subscriptions, and other non-hotel categories, to keep the first proof of concept focused on hotel cancellations.
- Accounts, persistent booking storage, payments, booking-platform integrations, and executing a cancellation; the product estimates policy outcomes and does not cancel bookings or guarantee refunds.
- Legal entitlement determinations, since Limnim only interprets the supplied policy and cannot verify other contract terms or applicable law.

## Post-build product direction — October 20, 2026

The user selected **Limnim** and shifted the target workflow toward hotel front-desk teams. The cancellation calculation remains the product kernel; live and sample results now also produce a deterministic, copyable guest response with the selected local time, calculated amounts, relevant policy quote, and estimate disclaimer. Staff review and send the reply through their existing channel. The app sends no guest message and has no PMS integration.

This is a narrow first step toward reducing repetitive guest questions. A general WhatsApp/SMS concierge, check-in and identity verification, room-upgrade offers, housekeeping dispatch, and ancillary-asset booking are separate product areas to validate later. They need their own operational data, integrations, and safety requirements before entering the prototype.

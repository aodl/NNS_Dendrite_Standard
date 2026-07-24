# Operator gates

Both gates are independent and **UNRUN**. Automated tests do not satisfy them.

## Gate 1 — Final-origin Internet Identity

**Purpose:** prove final-origin identity, Governance-only delegation, and anonymous
Dendrite behavior.

**Prerequisites / exact environment:** installed reviewed module using the exact
production configuration in [deployment](deployment.md), reviewed commit/hash, and an
interactive browser.

**Test data:** one operator-controlled principal and a target whose fresh report can
recognize that manager authority without exposing private material.

1. Load the canonical URL; expect certified application success and no redirect.
2. Open the canonical-origin popup and authenticate; expect successful II completion.
3. Record the exact displayed Dendrite principal; reload and expect restoration.
4. Inspect the session; expect delegation targets only the NNS Governance principal
   recorded in [deployment](deployment.md).
5. Confirm no approved alternatives, and an unapproved origin cannot sign in.
6. Run a fresh report; expect the correct controller/hotkey manager recognition.
7. Sign out; expect identity removal and a successful fresh anonymous verification.

**Evidence:** origin, headers, alternative-origin bytes, principal, target label,
screenshots/log references without credentials, commit and installed module hash.

**Abort:** wrong origin/principal/target, unrestricted delegation, Dendrite
authentication, popup/certification failure, or unexpected alternative acceptance.

- Pass/fail: **UNRUN**
- Operator: **UNRUN**
- Date: **UNRUN**
- Git commit: **UNRUN**
- Installed module hash: **UNRUN**

## Gate 2 — Controlled browser-to-NNS transaction

**Purpose:** prove exact confirmed browser-to-Governance mutation and safe uncertainty
handling.

**Prerequisites / exact environment:** Gate 1 passed; reviewed production frontend;
controlled neuron/proposal data with explicit authorization and affordable proposal
fee; browser developer evidence available.

**Test data:** exact reviewed request, controlled target/manager/receiver/proposal IDs,
one known-rejection case, one simulated ambiguous response boundary. Do not put IDs in
source.

1. Review an exact request; expect fee and complete Candid with no mutation before confirmation.
2. Confirm once; expect proposal ID, retained receipt, dashboard link, manager vote, and
   a fresh same-context anonymous report.
3. Produce a known Governance rejection and final-preflight failure; expect distinct
   receipts and no retry/update for preflight failure.
4. Exercise ambiguous outcome; expect blocking, explicit acknowledgment, and no retry
   of the unresolved request.
5. Delay `RefreshVotingPower`; ordinary time/power drift remains valid, but changed
   refresh timestamp invalidates.
6. Use explicit-ID-only receiver lookup; review controller/hotkeys. Controller/hotkey
   drift invalidates while stake-only drift is tolerated.
7. Exercise route/auth races: in-flight sign-out rejects; same-context post-response
   check occurs; navigation while settling is preserved.

**Expected result for every step:** exactly the outcome stated above, one submission at
most, no Dendrite-authenticated call, no hidden retry/poll/history.

**Evidence:** exact request/digest, fee, proposal/receipt references, network-call
counts/destinations, fresh report, race results, commit and installed module hash.

**Abort:** unexpected target/fee/authority, mutation before confirmation, multiple
submission, missing receipt/report, wrong delegation destination, unresolved outcome
not blocking, or any private material entering evidence.

- Pass/fail: **UNRUN**
- Operator: **UNRUN**
- Date: **UNRUN**
- Git commit: **UNRUN**
- Installed module hash: **UNRUN**

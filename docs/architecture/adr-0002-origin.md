# ADR 0002: canonical Internet Identity derivation origin

Status: operator value required before production deployment.

The build accepts one canonical HTTPS origin through an operator configuration
value. The production operator must replace `https://dendrite.example` before any
manager adds the resulting principal as a hotkey. Alternative origins must be
listed in the certified well-known document and must retain the same derivation
origin. Changing it later requires a hotkey migration.


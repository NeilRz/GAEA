# Security policy

GEOM operates a data-attestation oracle: datasets are hashed (SHA-256 over
canonical JSON), signed (Ed25519), and the digest manifest is anchored on
Solana via the Memo program. The integrity of that pipeline is the thing we
most want to hear about.

## Reporting a vulnerability

Email **security@geom.org** (or hello@geom.org if that bounces) with a
description and reproduction steps. Please do not open a public issue for
anything exploitable. We aim to acknowledge within 72 hours.

In scope, especially:

- Anything that lets a third party produce an attestation that verifies
  against a GEOM signer key.
- Signer-key exposure paths (CI, deployment, endpoints).
- Manipulation of `/api/orders` output (the execution URL must only ever be
  derived from the hardcoded, source-verified contract addresses).
- Cache-poisoning or amplification against the public API.

## Signer keys

The current oracle signer public key is published on the app's Status page
and in the README. Key rotations are announced on the Status page and the
old key's anchors remain verifiable against the historical record in
`src/data/anchors.json`.

## Non-custodial statement

GEOM holds no user funds, keys, or orders. The buy/sell surface resolves to
external venues and executes in the user's own wallet; there is no account
system and no server-side state to steal.

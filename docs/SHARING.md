# Public sharing contract

## Supported surfaces

- A completed course can be shared from its completion screen. The destination is the public course page, never the private completion/certificate route.
- The public High Load lesson `what-is-high-load` can be shared because it has a stable, indexable canonical URL.
- The first public preview level of each Kids Coding course can be shared. Locked and non-indexable levels do not receive sharing controls.
- Additional High Availability, Load Balancing and Caching lessons should use the same adapter only after they have stable public routes.

## Interaction and fallback

`SharePanel` provides the Web Share API, Copy Link, LinkedIn, Telegram and X. If native sharing is unavailable, the primary action attempts to copy the canonical URL. If clipboard access is unavailable, the URL remains in a labelled read-only field that selects its content on focus.

All outcomes are announced through a polite status region. External destinations have explicit accessible names and state that a new tab opens.

## Privacy and security

- Share payloads contain only editorial course or lesson data and an allowlisted public HTTP(S) URL.
- Learner name, completion date, progress, Knowledge Check results, child results and Supabase identifiers are excluded.
- Completion claims are plain share text; the destination does not pretend to be a public verifiable credential.
- Social URLs are created by the shared `buildShareUrl` adapter using `URL` and `URLSearchParams` rather than string concatenation.

## Open Graph

Course, public High Load lesson and Kids Coding level routes generate `1200 × 630` branded images from their actual content data with `next/og`. The root metadata contract uses `summary_large_image` for X/Twitter fallback.

Custom product analytics remain paused by product decision. This implementation does not reactivate `share` events; page views remain unchanged.

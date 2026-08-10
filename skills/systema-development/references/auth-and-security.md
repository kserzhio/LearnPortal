# Authentication and security readiness

## Current phase

The portal is static. Do not store passwords, access tokens, roles or authorization decisions in `localStorage`.

Create a boundary for anonymous progress today and server progress later:

```text
ProgressService
  ├── BrowserProgressStore
  └── ApiProgressStore
```

## Future login requirements

- Use an established identity provider or well-reviewed server authentication library.
- Prefer `HttpOnly`, `Secure`, `SameSite` cookies for browser sessions.
- Protect state-changing requests against CSRF when using cookie authentication.
- Rotate sessions after login and privilege changes; support server-side revocation.
- Enforce authorization on the server for every protected resource.
- If the product owns passwords, hash them with a current memory-hard algorithm such as Argon2id; never invent cryptography.
- Rate-limit login, reset and verification endpoints and return generic failure messages.
- Use verified, short-lived, single-use email verification and password reset tokens.
- Never log passwords, session tokens, reset tokens or complete profiles.
- Define account deletion, export, retention and consent before collecting personal data.

## Application security

- Treat lesson input, diagram labels, profile data and server responses as untrusted.
- Prefer `textContent`; sanitize supported rich text with an allowlist.
- Add a restrictive Content Security Policy when deployment configuration exists.
- Validate input on client and server; client validation is only UX.
- Use parameterized queries, least-privilege credentials and external secret storage.
- Add audit events for login, logout, reset, role changes and destructive account actions.

## Suggested domain model

- `User`: identity and profile.
- `CourseEnrollment`: access to a course.
- `LessonProgress`: completion and latest position.
- `SimulatorAttempt`: submitted architecture, validation result and timestamp.
- `Session`: revocable authenticated session.

Keep identity data separate from learning analytics so their retention policies can differ.

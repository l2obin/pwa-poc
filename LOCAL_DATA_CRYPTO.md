# Local data protection (DEK / KEK) — notes for the demo

This document explains how the demo on `src/routes/about.tsx` protects a Data Encryption Key (DEK) locally, what the current implementation does, what is safe and what is only a demo convenience, and recommendations for production.

Summary
- The demo generates a 256-bit DEK (AES-GCM) in the browser.
- The DEK is imported as a non-extractable CryptoKey and the raw bytes are kept in memory only briefly for wrapping.
- The DEK may be wrapped (encrypted) using a Key Encryption Key (KEK) derived in one of two ways:
  1. Preferred: an authenticator-provided secret obtained via the WebAuthn "hmac-secret" extension. This forces platform authenticator user verification (Windows Hello PIN/biometric) at wrap and unwrap.
  2. Fallback (demo-only): HKDF over the concatenation of the WebAuthn credential id and a locally-generated random client id stored in IndexedDB. This is weaker and only intended for local demo/debugging.
- Wrapped DEK and metadata (credential id, client id) are stored in IndexedDB (not localStorage). Plaintext DEK is never persisted.

Threat model and limitations
- The authenticator (platform TPM/Windows Hello) keeps private keys and enforces user verification. A flow that uses hmac-secret is strong: the secret is only available after user verification.
- The fallback HKDF approach is NOT cryptographically equivalent to an authenticator-backed secret. The credential id is not secret entropy; combine it with a random client id to raise difficulty for attackers, but this remains only a stopgap for demos.
- Showing the DEK base64 in the UI (the demo briefly does this) is explicitly insecure and is only for demonstration.
- Browser and authenticator support for hmac-secret varies widely. Do not rely on hmac-secret being available across all clients.

Detailed flows
- Generate DEK (user action):
  - Create 32 random bytes and import them as a non-extractable AES-GCM CryptoKey.
  - Raw bytes are kept in memory (`dekRawRef`) for the wrap operation and zeroed shortly afterward (or after a timeout).
- Wrap DEK (user action):
  - Attempt to obtain a KEK from the authenticator via `navigator.credentials.get(..., extensions: { hmacGetSecret: true })` and `allowCredentials` set to the saved credential id. This will prompt Windows Hello when available.
  - If hmac-secret is returned, import it as a raw AES key and use it to AES-GCM-encrypt the DEK raw bytes (iv + ciphertext).
  - If hmac-secret is not available and the demo fallback is enabled (checkbox), derive a KEK via HKDF over credentialId || clientId and use that to encrypt the DEK. If fallback is disabled, abort the operation and surface an error.
  - Store the wrapped DEK (base64 iv+cipher) in IndexedDB.
- Unwrap DEK (user action):
  - Reverse the steps above: prefer an authenticator hmac-secret assertion (will prompt PIN). If unavailable and fallback is enabled, derive KEK via HKDF and decrypt. If fallback is disabled, abort.
  - When decrypted, import the plaintext as a non-extractable AES-GCM key for use, and zero the plaintext bytes after import.

## Sequence diagram (Mermaid)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant A as App UI
    participant WebAuthn as Authenticator (Windows Hello)
    participant Crypto as WebCrypto (Subtle)
    participant IDB as IndexedDB

    Note over U,A: Generate DEK
    U->>A: Click "Generate DEK"
    A->>Crypto: crypto.getRandomValues -> create DEK (non-extractable)
    Crypto-->>A: DEK Key + raw bytes (brief in memory)
    A->>U: show DEK briefly (demo only)

    Note over U,A,WebAuthn: Register Credential (if needed)
    U->>A: ensureCredential (trigger during wrap if missing)
    A->>WebAuthn: navigator.credentials.create (platform, userVerification: required)
    WebAuthn-->>A: credentialId

    Note over A,WebAuthn,Crypto: Wrap DEK
    U->>A: Click "Wrap DEK"
    A->>WebAuthn: navigator.credentials.get (extensions: { hmacGetSecret: true }, allowCredentials: [credentialId])
    alt hmac-secret available
        WebAuthn-->>A: secret (hmac-secret)
        A->>Crypto: import secret as KEK
    else fallback (HKDF)
        A->>IDB: read credentialId + clientId
        A->>Crypto: HKDF(credentialId || clientId) -> KEK
    end
    A->>Crypto: AES-GCM encrypt DEK with KEK (iv + ciphertext)
    Crypto-->>A: wrappedDEK (iv+cipher)
    A->>IDB: store wrappedDEK

    Note over A,WebAuthn,Crypto: Unwrap DEK
    U->>A: Click "Unwrap DEK"
    A->>WebAuthn: navigator.credentials.get (extensions: { hmacGetSecret: true }, allowCredentials: [credentialId])
    alt hmac-secret available
        WebAuthn-->>A: secret (hmac-secret)
        A->>Crypto: import secret as KEK
    else fallback (HKDF)
        A->>IDB: read credentialId + clientId + wrappedDEK
        A->>Crypto: HKDF(credentialId || clientId) -> KEK
    end
    A->>Crypto: AES-GCM decrypt wrappedDEK -> DEK raw
    Crypto-->>A: DEK raw
    A->>Crypto: import DEK raw as non-extractable key
    A->>U: show DEK briefly (demo only)

```

Notes:
- The checkbox in the UI controls whether the demo will allow the HKDF fallback when the hmac-secret extension is unavailable.
- When hmac-secret is used, the authenticator (e.g., Windows Hello) will prompt the user (PIN/biometric) during the get() call.

UI control
- There is a checkbox (default: disabled) that controls whether the demo will fall back to the local HKDF derivation when hmac-secret is unavailable. For security, keep this unchecked in real deployments.

Developer notes
- Files: `src/routes/about.tsx` contains the demo implementation.
- Storage: `IndexedDB` object store `webauthn-demo-db` → store `kv` keys: `webauthn-cred-id`, `webauthn-client-id`, `wrapped-dek`.
- Types: the demo uses `@ts-ignore` for some WebAuthn extension typings because DOM TypeScript definitions vary.

Recommendations for production
1. Prefer authenticator-backed protection (hmac-secret or server-side flows). Do not rely on client-only secret derivation for sensitive keys.
2. If you need strong guarantees that keys live in hardware and were created there, request attestation during registration and verify attestation server-side.
3. Never display or log raw DEKs in production. The demo shows keys only for debugging; remove that before shipping.
4. Consider a server-assisted wrapping model: register the credential and send the authenticator public key to the server; the server can encrypt data or wrap keys with the public key and only allow operations after successful user verification.
5. Use secure storage for wrapped keys (IndexedDB is fine for wrapped ciphertext). Avoid localStorage for secrets.
6. Test on target browsers and authenticators: hmac-secret support varies; have a clear fallback policy that does not degrade security silently.

Quick test steps (dev)
1. Open the app on `https://localhost:5173`.
2. Click "Generate DEK" — you will briefly see the DEK (debug only).
3. Ensure Windows Hello is configured (PIN/biometric).
4. Click "Wrap DEK" with fallback disabled — if your authenticator supports hmac-secret, Windows Hello will prompt and wrap will succeed; if not, you will see an abort message.
5. To allow the demo fallback, enable the checkbox and try again — the demo will perform HKDF derivation and wrap the DEK locally.

Contact
If you want, I can change the demo to remove the fallback entirely, or implement a server-assisted attestation/ wrapping flow. Ask which direction you prefer.

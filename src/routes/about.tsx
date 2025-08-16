import { createFileRoute } from '@tanstack/react-router'
import { useState, useRef, useEffect } from 'react'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  // State for display
  const [dekB64, setDekB64] = useState<string | null>(null)
  const [wrappedB64, setWrappedB64] = useState<string | null>(null)
  const [credentialIdB64, setCredentialIdB64] = useState<string | null>(null)
  const [clientIdB64, setClientIdB64] = useState<string | null>(null)
  const [storedWrappedB64, setStoredWrappedB64] = useState<string | null>(null)
  const [hmacSupported, setHmacSupported] = useState<boolean | null>(null)
  const [allowHmacFallback, setAllowHmacFallback] = useState<boolean>(false)
  const [message, setMessage] = useState<string | null>(null)

  // Keep raw CryptoKey in ref when generated so we can import later if needed
  const dekKeyRef = useRef<CryptoKey | null>(null)
  // Keep raw DEK bytes briefly for wrapping; cleared after use
  const dekRawRef = useRef<ArrayBuffer | null>(null)

  // Helpers
  const bufToB64 = (buf: ArrayBuffer) => {
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
    return btoa(binary)
  }
  const b64ToBuf = (b64: string) => {
    const binary = atob(b64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  }

  // Minimal IndexedDB helper for storing small items
  function openDb() {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('webauthn-demo-db', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  async function idbGet(key: string): Promise<string | null> {
    const db = await openDb()
    return new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly')
      const store = tx.objectStore('kv')
      const r = store.get(key)
      r.onsuccess = () => resolve(r.result ?? null)
      r.onerror = () => reject(r.error)
    })
  }
  async function idbSet(key: string, value: string): Promise<void> {
    const db = await openDb()
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('kv', 'readwrite')
      const store = tx.objectStore('kv')
      const r = store.put(value, key)
      r.onsuccess = () => resolve()
      r.onerror = () => reject(r.error)
    })
  }

  // Generate a Data Encryption Key (DEK) using WebCrypto (AES-GCM)
  async function generateDek() {
    setMessage('Generating DEK (non-extractable, raw kept briefly)...')
    try {
      const raw = crypto.getRandomValues(new Uint8Array(32))
      // import as non-extractable key
      const key = await crypto.subtle.importKey('raw', raw.buffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
      dekKeyRef.current = key
      dekRawRef.current = raw.buffer.slice(0)
      // show DEK in base64 for demo purposes (will be cleared after timeout or when wrapped)
      try {
        setDekB64(bufToB64(dekRawRef.current as ArrayBuffer))
      } catch { setDekB64(null) }
      setWrappedB64(null)
      setMessage('DEK generated (shown briefly)')
      // clear raw and displayed DEK after 30s if not wrapped
      setTimeout(() => {
        try { if (dekRawRef.current) new Uint8Array(dekRawRef.current).fill(0); dekRawRef.current = null } catch { void 0 }
        setDekB64(null)
      }, 30000)
    } catch (err) {
      setMessage('Error generating DEK: ' + String(err))
    }
  }

  // Create a WebAuthn credential if one does not exist yet.
  // NOTE: For demo purposes we store only the credential id locally. We do not attempt to extract private key material.
  async function ensureCredential() {
    if (credentialIdB64 && clientIdB64) return credentialIdB64
    setMessage('Creating a WebAuthn credential and client id (local demo)...')
    try {
      const userId = crypto.getRandomValues(new Uint8Array(16))
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge: challenge.buffer,
        rp: { name: 'Local Demo' },
        user: { id: userId, name: 'local-user', displayName: 'Local User' },
        // Include both ES256 and RS256 to improve compatibility across authenticators
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' }, // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        attestation: 'none',
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      }
      // navigator.credentials.create may require HTTPS or localhost
      // and will prompt the user (platform authenticator) depending on environment.
      // We ignore the attestation response contents for this demo and only keep the id.
      // Surround with try/catch because some environments will reject create.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - lib DOM types may differ per TS config
      const cred = await navigator.credentials.create({ publicKey }) as PublicKeyCredential | null
      if (!cred) throw new Error('Credential creation returned null')
      const id = new Uint8Array(cred.rawId)
      const idB64 = bufToB64(id.buffer)
      await idbSet('webauthn-cred-id', idB64)
      setCredentialIdB64(idB64)

      // ensure a randomly generated client id (secret-ish) is stored and used in KEK derivation
      let clientId = clientIdB64
      if (!clientId) {
        const cid = crypto.getRandomValues(new Uint8Array(32))
        clientId = bufToB64(cid.buffer)
        await idbSet('webauthn-client-id', clientId)
        setClientIdB64(clientId)
      }

      setMessage('Credential and client id created and stored in IndexedDB')
      return idB64
    } catch (e) {
      setMessage('Error creating credential: ' + String(e))
      throw e
    }
  }

  // Derive a KEK from the stored credential id using HKDF (demonstration only).
  // Assumption: using credential id as stable local entropy for KEK derivation (not a secure production pattern).
  // Derive a KEK from the stored credential id and client id using HKDF (better than credential-id-only)
  async function deriveKekFromCredentialId(idB64: string) {
    // Ensure we have a client id
    let clientId = clientIdB64
    if (!clientId) {
      const stored = await idbGet('webauthn-client-id')
      if (stored) {
        clientId = stored
        setClientIdB64(stored)
      }
    }
    // Combine credential id and client id into IKM
    const idBuf = b64ToBuf(idB64)
    const clientBuf = clientId ? b64ToBuf(clientId) : new Uint8Array([0]).buffer
    const combined = new Uint8Array(idBuf.byteLength + clientBuf.byteLength)
    combined.set(new Uint8Array(idBuf), 0)
    combined.set(new Uint8Array(clientBuf), idBuf.byteLength)

    const ikm = await crypto.subtle.importKey('raw', combined.buffer, 'HKDF', false, ['deriveKey'])
    const salt = new TextEncoder().encode('webauthn-demo-salt')
    const kek = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: new Uint8Array([]) },
      ikm,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
    return kek
  }

  // Wrap (encrypt) the DEK using a KEK derived from the WebAuthn credential id and display the wrapped value.
  async function wrapDek() {
    setMessage('Wrapping DEK...')
    try {
      if (!dekRawRef.current) throw new Error('No DEK available. Generate one first.')
      const idB64 = await ensureCredential()
      if (!idB64) throw new Error('No credential id available')

      // Try hmac-secret via assertion (best-effort). If it fails and fallback is disabled, abort.
      let kek: CryptoKey | null = null
      try {
        const allowCreds: PublicKeyCredentialDescriptor[] = credentialIdB64
          ? [
              {
                id: new Uint8Array(b64ToBuf(credentialIdB64)),
                type: 'public-key',
                transports: ['internal' as AuthenticatorTransport],
              },
            ]
          : []

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const assertion = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)).buffer, allowCredentials: allowCreds, userVerification: 'required', extensions: { hmacGetSecret: true } } }) as PublicKeyCredential | null
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const ext = assertion?.getClientExtensionResults?.() || assertion?.clientExtensionResults
        if (ext && ext.hmacGetSecret) {
          const secretBuf = ext.hmacGetSecret as ArrayBuffer
          kek = await crypto.subtle.importKey('raw', secretBuf, 'AES-GCM', false, ['encrypt', 'decrypt'])
          setHmacSupported(true)
        } else {
          setHmacSupported(false)
          if (!allowHmacFallback) {
            setMessage('Authenticator did not provide hmac-secret and fallback is disabled — aborting wrap.')
            return
          }
        }
      } catch (err) {
        setHmacSupported(false)
        const name = (err && (err as Error).name) || String(err)
        if (!allowHmacFallback) {
          setMessage('hmac-secret assertion failed (' + name + '). Fallback disabled — aborting.')
          return
        }
        setMessage('hmac-secret assertion failed (' + name + '). Falling back to local derivation because fallback is enabled.')
      }

      if (!kek) kek = await deriveKekFromCredentialId(idB64)

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, kek, dekRawRef.current as ArrayBuffer)
      const ivArr = new Uint8Array(iv)
      const cipherArr = new Uint8Array(cipher)
      const combined = new Uint8Array(ivArr.length + cipherArr.length)
      combined.set(ivArr, 0)
      combined.set(cipherArr, ivArr.length)
      const wrapped = bufToB64(combined.buffer)
      await idbSet('wrapped-dek', wrapped)
      setWrappedB64(wrapped)
      setStoredWrappedB64(wrapped)
      // zero raw
  try { if (dekRawRef.current) new Uint8Array(dekRawRef.current).fill(0); dekRawRef.current = null } catch { void 0 }
      setMessage('DEK wrapped and stored in IndexedDB')
    } catch (e) {
      setMessage('Error wrapping DEK: ' + String(e))
    }
  }

  // Unwrap (decrypt) the wrapped DEK using the same derivation.
  async function unwrapDek() {
    setMessage('Unwrapping DEK...')
    try {
      const wrapped = wrappedB64 || storedWrappedB64 || (await idbGet('wrapped-dek'))
      if (!wrapped) throw new Error('No wrapped DEK available. Wrap one first.')
      const idB64 = credentialIdB64 || (await ensureCredential())
      if (!idB64) throw new Error('No credential id available')
      // Try hmac-secret first; abort if it fails and fallback is disabled
      let kek: CryptoKey | null = null
      try {
        const allowCreds: PublicKeyCredentialDescriptor[] = credentialIdB64
          ? [
              {
                id: new Uint8Array(b64ToBuf(credentialIdB64)),
                type: 'public-key',
                transports: ['internal' as AuthenticatorTransport],
              },
            ]
          : []
        // @ts-ignore
        const assertion = await navigator.credentials.get({ publicKey: { challenge: crypto.getRandomValues(new Uint8Array(32)).buffer, allowCredentials: allowCreds, userVerification: 'required', extensions: { hmacGetSecret: true } } }) as PublicKeyCredential | null
        // @ts-ignore
        const ext = assertion?.getClientExtensionResults?.() || assertion?.clientExtensionResults
        if (ext && ext.hmacGetSecret) {
          const secretBuf = ext.hmacGetSecret as ArrayBuffer
          kek = await crypto.subtle.importKey('raw', secretBuf, 'AES-GCM', false, ['encrypt', 'decrypt'])
          setHmacSupported(true)
        } else {
          setHmacSupported(false)
          if (!allowHmacFallback) {
            setMessage('Authenticator did not provide hmac-secret and fallback is disabled — aborting unwrap.')
            return
          }
        }
      } catch (err) {
        setHmacSupported(false)
        const name = (err && (err as Error).name) || String(err)
        if (!allowHmacFallback) {
          setMessage('hmac-secret assertion failed (' + name + '). Fallback disabled — aborting.')
          return
        }
        setMessage('hmac-secret assertion failed (' + name + '). Falling back to local derivation because fallback is enabled.')
      }

      if (!kek) kek = await deriveKekFromCredentialId(idB64)
      const combinedBuf = b64ToBuf(wrapped)
      const combined = new Uint8Array(combinedBuf)
      const iv = combined.slice(0, 12)
      const cipher = combined.slice(12)
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, kek, cipher.buffer)
      // import as a non-extractable key for use
      const imported = await crypto.subtle.importKey('raw', plain, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
      dekKeyRef.current = imported
      // show DEK (base64) briefly for demo purposes
      try {
        setDekB64(bufToB64(plain))
      } catch { setDekB64(null) }
      setMessage('Successfully unwrapped DEK and imported as non-extractable key (shown briefly)')
      // clear displayed DEK and zero plaintext after 30s
      setTimeout(() => {
        try { new Uint8Array(plain).fill(0) } catch { void 0 }
        setDekB64(null)
      }, 30000)
    } catch (e) {
      setMessage('Error unwrapping DEK: ' + String(e))
    }
  }

  // Load stored values from IndexedDB on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const cred = await idbGet('webauthn-cred-id')
        const cid = await idbGet('webauthn-client-id')
        const wrapped = await idbGet('wrapped-dek')
        if (!mounted) return
        if (cred) setCredentialIdB64(cred)
        if (cid) setClientIdB64(cid)
        if (wrapped) {
          setStoredWrappedB64(wrapped)
          setWrappedB64(wrapped)
        }
  } catch { void 0 }
    })()
    return () => { mounted = false }
  }, [idbGet])

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">DEK + WebAuthn demo</h1>
      <p className="text-sm text-muted-foreground">This page demonstrates generating a DEK with WebCrypto, deriving a KEK from a locally-created WebAuthn credential id (demo-only), wrapping the DEK, and unwrapping it.</p>

      <div className="flex gap-2">
        <button className="btn" onClick={() => generateDek()}>Generate DEK (WebCrypto)</button>
        <button className="btn" onClick={() => wrapDek()}>Wrap DEK using WebAuthn-derived KEK</button>
        <button className="btn" onClick={() => unwrapDek()}>Unwrap DEK (WebCrypto)</button>
      </div>

      <div className="flex items-center gap-2">
        <input id="hmac-fallback" type="checkbox" checked={allowHmacFallback} onChange={(e) => setAllowHmacFallback(e.target.checked)} />
        <label htmlFor="hmac-fallback" className="text-sm">Allow fallback to local KEK derivation if authenticator hmac-secret is unavailable (disabled by default)</label>
      </div>

      <div className="space-y-2">
        <div>
          <strong>Credential id (base64):</strong>
          <div className="break-all">{credentialIdB64 ?? '— not created yet —'}</div>
        </div>
        <div>
          <strong>DEK (base64):</strong>
          <div className="break-all">{dekB64 ?? '—'}</div>
        </div>
        <div>
          <strong>Wrapped DEK (base64 iv+cipher):</strong>
          <div className="break-all">{wrappedB64 ?? '—'}</div>
        </div>
        <div>
          <strong>Status:</strong>
          <div>{message ?? 'idle'}</div>
        </div>
      </div>
    </div>
  )
}

import type { Bindings, PresenterRecord, UserRecord } from '../types'

const ENC_PREFIX = 'enc:v1:'
const MIN_SECRET_LENGTH = 32
const IV_BYTE_LENGTH = 12
const KEY_INFO = new TextEncoder().encode('event-chat-aes-256-gcm-v1')
const keyCache = new Map<string, Promise<CryptoKey>>()

const toBase64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')

const fromBase64Url = (b64url: string): Uint8Array =>
  Uint8Array.from(atob(b64url.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0))

const resolveEncryptionSecret = (env: Bindings): string => {
  const secret = (env.ENCRYPTION_KEY?.trim() || env.SESSION_SECRET) ?? ''
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error('ENCRYPTION_KEY or SESSION_SECRET must be at least 32 characters')
  }
  return secret
}

const deriveAesKey = (secret: string): Promise<CryptoKey> => {
  const cached = keyCache.get(secret)
  if (cached) return cached
  const promise = crypto.subtle
    .importKey('raw', new TextEncoder().encode(secret), 'HKDF', false, ['deriveKey'])
    .then((baseKey) =>
      crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: KEY_INFO },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      ),
    )
  keyCache.set(secret, promise)
  return promise
}

export const encryptField = async (env: Bindings, plaintext: string): Promise<string> => {
  const key = await deriveAesKey(resolveEncryptionSecret(env))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return `${ENC_PREFIX}${toBase64Url(iv)}:${toBase64Url(new Uint8Array(ct))}`
}

export const encryptNullableField = async (
  env: Bindings,
  plaintext: string | null | undefined,
): Promise<string | null> => (plaintext == null ? null : encryptField(env, plaintext))

export const decryptField = async (env: Bindings, stored: string): Promise<string> => {
  if (!stored.startsWith(ENC_PREFIX)) return stored
  const rest = stored.slice(ENC_PREFIX.length)
  const sepIdx = rest.indexOf(':')
  if (sepIdx <= 0) return ''
  try {
    const iv = fromBase64Url(rest.slice(0, sepIdx))
    const data = fromBase64Url(rest.slice(sepIdx + 1))
    const key = await deriveAesKey(resolveEncryptionSecret(env))
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(plainBuf)
  } catch {
    return '[復号エラー]'
  }
}

export const decryptNullableField = async (
  env: Bindings,
  stored: string | null | undefined,
): Promise<string | null> => (stored == null ? null : decryptField(env, stored))

export const decryptUserRecord = async (env: Bindings, user: UserRecord): Promise<UserRecord> => ({
  ...user,
  name: await decryptField(env, user.name),
  avatar_url: await decryptNullableField(env, user.avatar_url),
  slide_url:
    user.slide_url !== undefined ? await decryptNullableField(env, user.slide_url) : undefined,
})

export const decryptPresenterRecords = async (
  env: Bindings,
  rows: PresenterRecord[],
): Promise<PresenterRecord[]> =>
  Promise.all(
    rows.map(async (p) => ({
      ...p,
      name: await decryptField(env, p.name),
      slide_url: await decryptNullableField(env, p.slide_url),
    })),
  )

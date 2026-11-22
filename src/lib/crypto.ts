import type { Bindings, PresenterRecord, UserRecord } from '../types'

const ENC_PREFIX = 'enc:v1:'
const MIN_SECRET_LENGTH = 32
const IV_BYTE_LENGTH = 12
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const KEY_INFO = encoder.encode('event-chat-aes-256-gcm-v1')
const keyCache = new Map<string, Promise<CryptoKey>>()
const resolvedKeyCache = new Map<string, CryptoKey>()

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

const fromBase64Url = (b64url: string): Uint8Array => {
  const bin = atob(b64url.replaceAll('-', '+').replaceAll('_', '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const resolveEncryptionSecret = (env: Bindings): string => {
  const secret = (env.ENCRYPTION_KEY?.trim() || env.SESSION_SECRET) ?? ''
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error('ENCRYPTION_KEY or SESSION_SECRET must be at least 32 characters')
  }
  return secret
}

const deriveAesKey = (secret: string): CryptoKey | Promise<CryptoKey> => {
  const resolved = resolvedKeyCache.get(secret)
  if (resolved) return resolved
  const cached = keyCache.get(secret)
  if (cached) return cached
  const promise = crypto.subtle
    .importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey'])
    .then((baseKey) =>
      crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: KEY_INFO },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      ),
    )
    .then((key) => {
      resolvedKeyCache.set(secret, key)
      return key
    })
  keyCache.set(secret, promise)
  return promise
}

export const encryptField = async (env: Bindings, plaintext: string): Promise<string> => {
  const secret = resolveEncryptionSecret(env)
  const key = resolvedKeyCache.get(secret) ?? (await deriveAesKey(secret))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTE_LENGTH))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(plaintext))
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
    const secret = resolveEncryptionSecret(env)
    const key = resolvedKeyCache.get(secret) ?? (await deriveAesKey(secret))
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return decoder.decode(plainBuf)
  } catch {
    return '[復号エラー]'
  }
}

export const decryptNullableField = async (
  env: Bindings,
  stored: string | null | undefined,
): Promise<string | null> => (stored == null ? null : decryptField(env, stored))

export const decryptUserRecord = async (env: Bindings, user: UserRecord): Promise<UserRecord> => {
  const [name, avatar_url, slide_url] = await Promise.all([
    decryptField(env, user.name),
    decryptNullableField(env, user.avatar_url),
    user.slide_url !== undefined
      ? decryptNullableField(env, user.slide_url)
      : Promise.resolve(undefined),
  ])
  return { ...user, name, avatar_url, slide_url }
}

export const decryptPresenterRecords = async (
  env: Bindings,
  rows: PresenterRecord[],
): Promise<PresenterRecord[]> =>
  Promise.all(
    rows.map(async (p) => {
      const [name, slide_url] = await Promise.all([
        decryptField(env, p.name),
        decryptNullableField(env, p.slide_url),
      ])
      return { ...p, name, slide_url }
    }),
  )

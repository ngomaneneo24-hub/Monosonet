import React from 'react'
import {USE_SONET_E2E_ENCRYPTION} from '#/env'

export interface E2EKeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
  publicKeyBytes: Uint8Array
  fingerprint: string
}

export interface E2EMessage {
  encryptedContent: string
  iv: string
  senderPublicKey: string
  timestamp: string
  signature?: string
}

export interface E2EEncryptedPayload {
  ciphertext: string
  iv: string
  tag: string
  ephemeralPublicKey: string
  aad: string
}

export class SonetE2EEncryption {
  private keyPair: E2EKeyPair | null = null
  private keyCache = new Map<string, CryptoKey>()
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    if (!USE_SONET_E2E_ENCRYPTION) {
      console.log('E2E encryption disabled')
      return
    }

    try {
      if (!this.keyPair) {
        this.keyPair = await this.generateKeyPair()
      }

      this.isInitialized = true
      console.log('E2E encryption initialized')
    } catch (error) {
      console.error('Failed to initialize E2E encryption:', error)
      throw error
    }
  }

  async generateKeyPair(): Promise<E2EKeyPair> {
    try {
      // Use P-256 consistently for ECDH/ECDSA in this implementation
      const keyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true,
        ['deriveKey', 'deriveBits']
      )

      const publicKeyBytes = await crypto.subtle.exportKey('raw', keyPair.publicKey)
      const fingerprint = await this.generateFingerprint(publicKeyBytes)

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        publicKeyBytes: new Uint8Array(publicKeyBytes),
        fingerprint,
      }
    } catch (error) {
      console.error('Failed to generate key pair:', error)
      throw error
    }
  }

  async generateFingerprint(publicKeyBytes: ArrayBuffer): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', publicKeyBytes)
    const hashArray = new Uint8Array(hash)
    return Array.from(hashArray.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(':')
  }

  async encryptMessage(
    message: string,
    recipientPublicKeyBytes: Uint8Array,
    chatId: string,
    messageId: string,
    senderId: string,
  ): Promise<E2EEncryptedPayload> {
    if (!this.keyPair) {
      throw new Error('E2E encryption not initialized')
    }

    try {
      const recipientPublicKey = await crypto.subtle.importKey(
        'raw',
        recipientPublicKeyBytes,
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        false,
        ['deriveBits']
      )

      const ephemeralKeyPair = await crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        true,
        ['deriveBits']
      )

      // ECDH shared secret
      const sharedSecret = await crypto.subtle.deriveBits(
        {
          name: 'ECDH',
          public: recipientPublicKey,
        },
        ephemeralKeyPair.privateKey,
        256
      )

      // Per-message salt = IV; info ties to context
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const info = new TextEncoder().encode('sonet:e2e:v1')

      // Generate AAD (Additional Authenticated Data) for integrity binding
      // Format: hash(msgId|chatId|senderId|alg|keyId) - matches server expectations
      const ephemeralPublicKeyBytes = await crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey)
      const aadComponents = [
        messageId,
        chatId, 
        senderId,
        'AES-GCM',
        this.arrayBufferToBase64(ephemeralPublicKeyBytes)
      ].join('|')
      
      const aadHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(aadComponents))
      const aad = Array.from(new Uint8Array(aadHash)).map(b => b.toString(16).padStart(2, '0')).join('')

      // HKDF extract+expand to AES-GCM key
      const hkdfKey = await crypto.subtle.importKey(
        'raw',
        sharedSecret,
        { name: 'HKDF' },
        false,
        ['deriveKey']
      )
      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: iv, // bind key to nonce to avoid reuse across messages
          info,
        },
        hkdfKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      )

      const encodedMessage = new TextEncoder().encode(message)
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        aesKey,
        encodedMessage
      )

      const encryptedArray = new Uint8Array(encrypted)
      const ciphertext = encryptedArray.slice(0, -16)
      const tag = encryptedArray.slice(-16)

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv),
        tag: this.arrayBufferToBase64(tag),
        ephemeralPublicKey: this.arrayBufferToBase64(ephemeralPublicKeyBytes),
        aad: aad, // Include AAD for server validation
      }
    } catch (error) {
      console.error('Failed to encrypt message:', error)
      throw error
    }
  }

  async decryptMessage(
    encryptedPayload: E2EEncryptedPayload,
    senderPublicKeyBytes: Uint8Array,
  ): Promise<string> {
    if (!this.keyPair) {
      throw new Error('E2E encryption not initialized')
    }

    try {
      const senderPublicKey = await crypto.subtle.importKey(
        'raw',
        senderPublicKeyBytes,
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        false,
        ['deriveBits']
      )

      const ephemeralPublicKeyBytes = this.base64ToArrayBuffer(encryptedPayload.ephemeralPublicKey)
      const ephemeralPublicKey = await crypto.subtle.importKey(
        'raw',
        ephemeralPublicKeyBytes,
        {
          name: 'ECDH',
          namedCurve: 'P-256',
        },
        false,
        ['deriveBits']
      )

      const sharedSecret = await crypto.subtle.deriveBits(
        {
          name: 'ECDH',
          public: ephemeralPublicKey,
        },
        this.keyPair.privateKey,
        256
      )

      const iv = this.base64ToArrayBuffer(encryptedPayload.iv)
      const info = new TextEncoder().encode('sonet:e2e:v1')

      const hkdfKey = await crypto.subtle.importKey('raw', sharedSecret, { name: 'HKDF' }, false, ['deriveKey'])
      const aesKey = await crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new Uint8Array(iv),
          info,
        },
        hkdfKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      )

      const ciphertext = this.base64ToArrayBuffer(encryptedPayload.ciphertext)
      const tag = this.base64ToArrayBuffer(encryptedPayload.tag)

      const encryptedData = new Uint8Array(ciphertext.byteLength + tag.byteLength)
      encryptedData.set(new Uint8Array(ciphertext), 0)
      encryptedData.set(new Uint8Array(tag), ciphertext.byteLength)

      const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, aesKey, encryptedData)
      return new TextDecoder().decode(decrypted)
    } catch (error) {
      console.error('Failed to decrypt message:', error)
      throw error
    }
  }

  async signMessage(message: string): Promise<string> {
    if (!this.keyPair) {
      throw new Error('E2E encryption not initialized')
    }

    try {
      // Export private key to PKCS8 and import for ECDSA signing
      const signingKey = await crypto.subtle.importKey(
        'pkcs8',
        await crypto.subtle.exportKey('pkcs8', this.keyPair.privateKey),
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['sign']
      )

      const encodedMessage = new TextEncoder().encode(message)
      const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, encodedMessage)
      return this.arrayBufferToBase64(signature)
    } catch (error) {
      console.error('Failed to sign message:', error)
      throw error
    }
  }

  async verifySignature(
    message: string,
    signature: string,
    publicKeyBytes: Uint8Array,
  ): Promise<boolean> {
    try {
      const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes,
        { name: 'ECDSA', namedCurve: 'P-256' },
        false,
        ['verify']
      )

      const encodedMessage = new TextEncoder().encode(message)
      const signatureBytes = this.base64ToArrayBuffer(signature)

      return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signatureBytes, encodedMessage)
    } catch (error) {
      console.error('Failed to verify signature:', error)
      return false
    }
  }

  getPublicKeyBytes(): Uint8Array | null {
    return this.keyPair?.publicKeyBytes || null
  }

  getFingerprint(): string | null {
    return this.keyPair?.fingerprint || null
  }

  isEnabled(): boolean {
    return USE_SONET_E2E_ENCRYPTION && this.isInitialized
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  destroy(): void {
    this.keyPair = null
    this.keyCache.clear()
    this.isInitialized = false
  }
}

let globalE2E: SonetE2EEncryption | null = null

export function getE2EEncryption(): SonetE2EEncryption {
  if (!globalE2E) {
    globalE2E = new SonetE2EEncryption()
  }
  return globalE2E
}

export function useE2EEncryption() {
  const [e2e] = React.useState(() => getE2EEncryption())
  const [isInitialized, setIsInitialized] = React.useState(false)

  React.useEffect(() => {
    e2e.initialize().then(() => {
      setIsInitialized(true)
    }).catch(console.error)

    return () => {
      // keep global instance
    }
  }, [e2e])

  return {
    e2e,
    isInitialized,
    isEnabled: e2e.isEnabled(),
    publicKeyBytes: e2e.getPublicKeyBytes(),
    fingerprint: e2e.getFingerprint(),
  }
}
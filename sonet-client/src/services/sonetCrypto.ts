import {nanoid} from 'nanoid'

export interface CryptoKeyPair {
  publicKey: CryptoKey
  privateKey: CryptoKey
  keyId: string
  createdAt: string
}

export interface SessionKey {
  keyId: string
  chatId: string
  key: CryptoKey
  createdAt: string
  expiresAt: string
  isEphemeral: boolean
}

export interface EncryptedMessage {
  encryptedContent: string
  iv: string
  authTag: string
  keyId: string
  algorithm: string
  timestamp: string
}

export interface KeyExchangeMessage {
  type: 'key_exchange'
  keyId: string
  publicKey: string
  timestamp: string
  signature: string
}

export class SonetCrypto {
  private keyPair: CryptoKeyPair | null = null
  private sessionKeys = new Map<string, SessionKey>()
  private deviceId: string
  private userId: string

  constructor(userId: string, deviceId?: string) {
    this.userId = userId
    this.deviceId = deviceId || this.generateDeviceId()
  }

  private generateDeviceId(): string {
    return `device_${nanoid(16)}`
  }

  // Key Management
  async generateKeyPair(): Promise<CryptoKeyPair> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey', 'deriveBits']
      )

      const keyId = `key_${nanoid(16)}`
      const createdAt = new Date().toISOString()

      this.keyPair = {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        keyId,
        createdAt
      }

      return this.keyPair
    } catch (error) {
      console.error('Failed to generate key pair:', error)
      throw new Error('Key generation failed')
    }
  }

  async getOrCreateKeyPair(): Promise<CryptoKeyPair> {
    if (this.keyPair) {
      return this.keyPair
    }
    return this.generateKeyPair()
  }

  async exportPublicKey(keyPair: CryptoKeyPair): Promise<string> {
    try {
      const exported = await window.crypto.subtle.exportKey('spki', keyPair.publicKey)
      return btoa(String.fromCharCode(...new Uint8Array(exported)))
    } catch (error) {
      console.error('Failed to export public key:', error)
      throw new Error('Public key export failed')
    }
  }

  async importPublicKey(publicKeyData: string): Promise<CryptoKey> {
    try {
      const keyData = Uint8Array.from(atob(publicKeyData), c => c.charCodeAt(0))
      return await window.crypto.subtle.importKey(
        'spki',
        keyData,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        []
      )
    } catch (error) {
      console.error('Failed to import public key:', error)
      throw new Error('Public key import failed')
    }
  }

  // Session Key Management
  async deriveSessionKey(
    chatId: string,
    recipientPublicKey: CryptoKey,
    isEphemeral: boolean = true
  ): Promise<SessionKey> {
    if (!this.keyPair) {
      throw new Error('No key pair available')
    }

    try {
      // Derive shared secret
      const sharedSecret = await window.crypto.subtle.deriveBits(
        {
          name: 'ECDH',
          public: recipientPublicKey
        },
        this.keyPair.privateKey,
        256
      )

      // Derive session key using HKDF
      const sessionKey = await window.crypto.subtle.deriveKey(
        {
          name: 'HKDF',
          hash: 'SHA-256',
          salt: new TextEncoder().encode(chatId),
          info: new TextEncoder().encode('sonet_session_key')
        },
        sharedSecret,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      )

      const keyId = `session_${nanoid(16)}`
      const createdAt = new Date().toISOString()
      const expiresAt = isEphemeral 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days

      const sessionKeyObj: SessionKey = {
        keyId,
        chatId,
        key: sessionKey,
        createdAt,
        expiresAt,
        isEphemeral
      }

      this.sessionKeys.set(keyId, sessionKeyObj)
      return sessionKeyObj
    } catch (error) {
      console.error('Failed to derive session key:', error)
      throw new Error('Session key derivation failed')
    }
  }

  async getSessionKey(chatId: string): Promise<SessionKey | null> {
    // Find the most recent non-expired session key for this chat
    let bestKey: SessionKey | null = null
    
    for (const [_, sessionKey] of this.sessionKeys) {
      if (sessionKey.chatId === chatId && new Date(sessionKey.expiresAt) > new Date()) {
        if (!bestKey || new Date(sessionKey.createdAt) > new Date(bestKey.createdAt)) {
          bestKey = sessionKey
        }
      }
    }

    return bestKey
  }

  // Message Encryption/Decryption
  async encryptMessage(
    message: string,
    chatId: string,
    recipientPublicKey: CryptoKey
  ): Promise<EncryptedMessage> {
    try {
      // Get or create session key
      let sessionKey = await this.getSessionKey(chatId)
      if (!sessionKey) {
        sessionKey = await this.deriveSessionKey(chatId, recipientPublicKey)
      }

      // Generate IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12))
      
      // Encrypt message
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: new TextEncoder().encode(chatId)
        },
        sessionKey.key,
        new TextEncoder().encode(message)
      )

      // Extract auth tag (last 16 bytes)
      const encryptedArray = new Uint8Array(encrypted)
      const authTag = encryptedArray.slice(-16)
      const encryptedContent = encryptedArray.slice(0, -16)

      return {
        encryptedContent: btoa(String.fromCharCode(...encryptedContent)),
        iv: btoa(String.fromCharCode(...iv)),
        authTag: btoa(String.fromCharCode(...authTag)),
        keyId: sessionKey.keyId,
        algorithm: 'AES-256-GCM',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('Failed to encrypt message:', error)
      throw new Error('Message encryption failed')
    }
  }

  async decryptMessage(
    encryptedMessage: EncryptedMessage,
    chatId: string
  ): Promise<string> {
    try {
      const sessionKey = await this.getSessionKey(chatId)
      if (!sessionKey) {
        throw new Error('No session key available for decryption')
      }

      // Decode base64 data
      const encryptedContent = Uint8Array.from(atob(encryptedMessage.encryptedContent), c => c.charCodeAt(0))
      const iv = Uint8Array.from(atob(encryptedMessage.iv), c => c.charCodeAt(0))
      const authTag = Uint8Array.from(atob(encryptedMessage.authTag), c => c.charCodeAt(0))

      // Combine encrypted content and auth tag
      const fullEncrypted = new Uint8Array(encryptedContent.length + authTag.length)
      fullEncrypted.set(encryptedContent)
      fullEncrypted.set(authTag, encryptedContent.length)

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv,
          additionalData: new TextEncoder().encode(chatId)
        },
        sessionKey.key,
        fullEncrypted
      )

      return new TextDecoder().decode(decrypted)
    } catch (error) {
      console.error('Failed to decrypt message:', error)
      throw new Error('Message decryption failed')
    }
  }

  // Key Exchange
  async createKeyExchangeMessage(): Promise<KeyExchangeMessage> {
    if (!this.keyPair) {
      throw new Error('No key pair available')
    }

    try {
      const publicKeyData = await this.exportPublicKey(this.keyPair)
      const timestamp = new Date().toISOString()
      
      // Create signature for verification
      const signature = await this.signData(
        `${this.keyPair.keyId}:${publicKeyData}:${timestamp}`
      )

      return {
        type: 'key_exchange',
        keyId: this.keyPair.keyId,
        publicKey: publicKeyData,
        timestamp,
        signature
      }
    } catch (error) {
      console.error('Failed to create key exchange message:', error)
      throw new Error('Key exchange message creation failed')
    }
  }

  async verifyKeyExchangeMessage(message: KeyExchangeMessage): Promise<boolean> {
    try {
      // In a real implementation, you would verify the signature against the sender's public key
      // For now, we'll just verify the message structure
      return (
        message.type === 'key_exchange' &&
        !!message.keyId &&
        !!message.publicKey &&
        !!message.timestamp &&
        !!message.signature
      )
    } catch (error) {
      console.error('Failed to verify key exchange message:', error)
      return false
    }
  }

  // Utility Methods
  private async signData(data: string): Promise<string> {
    if (!this.keyPair) {
      throw new Error('No key pair available')
    }

    try {
      const signature = await window.crypto.subtle.sign(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        this.keyPair.privateKey,
        new TextEncoder().encode(data)
      )

      return btoa(String.fromCharCode(...new Uint8Array(signature)))
    } catch (error) {
      console.error('Failed to sign data:', error)
      throw new Error('Data signing failed')
    }
  }

  // Cleanup
  async rotateSessionKeys(chatId: string): Promise<void> {
    // Remove old session keys for this chat
    for (const [keyId, sessionKey] of this.sessionKeys) {
      if (sessionKey.chatId === chatId) {
        this.sessionKeys.delete(keyId)
      }
    }
  }

  async cleanupExpiredKeys(): Promise<void> {
    const now = new Date()
    for (const [keyId, sessionKey] of this.sessionKeys) {
      if (new Date(sessionKey.expiresAt) <= now) {
        this.sessionKeys.delete(keyId)
      }
    }
  }

  // Getters
  getDeviceId(): string {
    return this.deviceId
  }

  getUserId(): string {
    return this.userId
  }

  getKeyPair(): CryptoKeyPair | null {
    return this.keyPair
  }

  getSessionKeyCount(): number {
    return this.sessionKeys.size
  }
}

// Export singleton instance
export const sonetCrypto = new SonetCrypto('', '')
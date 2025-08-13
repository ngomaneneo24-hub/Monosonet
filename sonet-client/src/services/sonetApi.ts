import {SONET_API_BASE} from '#/env'

export type JsonMap = Record<string, any>

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export class SonetApiError extends Error {
  status: number
  body: any
  constructor(message: string, status: number, body?: any) {
    super(message)
    this.status = status
    this.body = body
  }
}

export class SonetApi {
  private baseUrl: string
  private tokens: AuthTokens | null
  private onTokens?: (t: AuthTokens | null) => void

  constructor(baseUrl: string = SONET_API_BASE) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.tokens = null
  }

  setTokens(tokens: AuthTokens | null, notify?: boolean) {
    this.tokens = tokens
    if (notify && this.onTokens) this.onTokens(tokens)
  }

  onTokenChange(cb: (t: AuthTokens | null) => void) {
    this.onTokens = cb
  }

  // Core fetch with JSON and auth header
  async fetchJson(path: string, init: RequestInit = {}, retryOn401 = true): Promise<any> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    }
    if (this.tokens?.accessToken) {
      headers['authorization'] = `Bearer ${this.tokens.accessToken}`
    }
    const res = await fetch(url, {...init, headers})

    if (res.status === 401 && retryOn401 && this.tokens?.refreshToken) {
      const refreshed = await this.refreshToken(this.tokens.refreshToken)
      if (refreshed?.access_token) {
        this.setTokens({
          accessToken: refreshed.access_token,
          refreshToken: this.tokens?.refreshToken,
        }, true)
        return this.fetchJson(path, init, false)
      }
    }

    const text = await res.text()
    const body = safeJson(text)
    if (!res.ok) {
      throw new SonetApiError(body?.message || res.statusText, res.status, body)
    }
    return body
  }

  // Form/multipart
  async fetchForm(path: string, form: FormData): Promise<any> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {}
    if (this.tokens?.accessToken) {
      headers['authorization'] = `Bearer ${this.tokens.accessToken}`
    }
    const res = await fetch(url, {method: 'NOTE', headers, body: form})
    const text = await res.text()
    const body = safeJson(text)
    if (!res.ok) {
      throw new SonetApiError(body?.message || res.statusText, res.status, body)
    }
    return body
  }

  // Auth
  async register(input: {username: string; email: string; password: string; display_name?: string}) {
    return this.fetchJson('/v1/auth/register', {
      method: 'NOTE',
      body: JSON.stringify({
        username: input.username,
        email: input.email,
        password: input.password,
        display_name: input.display_name ?? '',
        accept_terms: true,
        accept_privacy: true,
      }),
    })
  }

  async login(input: {username: string; password: string}) {
    const body = await this.fetchJson('/v1/auth/login', {
      method: 'NOTE',
      body: JSON.stringify({username: input.username, password: input.password}),
    })
    const tokens: AuthTokens = {accessToken: body.access_token, refreshToken: body.refresh_token}
    this.setTokens(tokens, true)
    return body
  }

  async refreshToken(refreshToken: string) {
    return this.fetchJson('/v1/auth/refresh', {
      method: 'NOTE',
      body: JSON.stringify({refresh_token: refreshToken}),
    }, false)
  }

  async logout(sessionId?: string, all?: boolean) {
    try {
      await this.fetchJson('/v1/auth/logout', {
        method: 'NOTE',
        body: JSON.stringify({session_id: sessionId || '', logout_all_devices: !!all}),
      })
    } finally {
      this.setTokens(null, true)
    }
  }

  // Users
  async getMe() {
    return this.fetchJson('/v1/users/me')
  }

  async getUser(id: string) {
    return this.fetchJson(`/v1/users/${encodeURIComponent(id)}`)
  }

  async updateMe(patch: JsonMap) {
    return this.fetchJson('/v1/users/me', {method: 'PUT', body: JSON.stringify(patch)})
  }

  // Notes
  async createNote(input: {text: string; reply_to_id?: string; quote_note_id?: string; attachments?: any[]; visibility?: number; is_sensitive?: boolean}) {
    return this.fetchJson('/v1/notes', {method: 'NOTE', body: JSON.stringify(input)})
  }
  async getNote(id: string, opts?: {include_thread?: boolean}) {
    const q = opts?.include_thread ? '?include_thread=true' : ''
    return this.fetchJson(`/v1/notes/${encodeURIComponent(id)}${q}`)
  }
  async deleteNote(id: string, opts?: {cascade?: boolean}) {
    const q = opts?.cascade ? '?cascade=true' : ''
    return this.fetchJson(`/v1/notes/${encodeURIComponent(id)}${q}`, {method: 'DELETE'})
  }
  async likeNote(id: string, like = true) {
    if (like) return this.fetchJson(`/v1/notes/${encodeURIComponent(id)}/like`, {method: 'NOTE', body: JSON.stringify({like: true})})
    return this.fetchJson(`/v1/notes/${encodeURIComponent(id)}/like`, {method: 'DELETE'})
  }
  async renote(id: string, renote = true) {
    return this.fetchJson(`/v1/notes/${encodeURIComponent(id)}/renote`, {method: 'NOTE', body: JSON.stringify({renote})})
  }

  // Timeline
  async getHomeTimeline(params?: {limit?: number; cursor?: string}) {
    const q = new URLSearchParams()
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.cursor) q.set('cursor', params.cursor)
    return this.fetchJson(`/v1/timeline/home${q.toString() ? `?${q}` : ''}`)
  }
  async getUserTimeline(id: string, params?: {limit?: number; cursor?: string; include_replies?: boolean; include_renotes?: boolean}) {
    const q = new URLSearchParams()
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.cursor) q.set('cursor', params.cursor)
    if (params?.include_replies) q.set('include_replies', 'true')
    if (params?.include_renotes === false) q.set('include_renotes', 'false')
    return this.fetchJson(`/v1/timeline/user/${encodeURIComponent(id)}${q.toString() ? `?${q}` : ''}`)
  }

  // Media
  async uploadMedia(file: Blob, filename: string, mime: string) {
    const form = new FormData()
    const wrapped = new File([file], filename, {type: mime})
    form.append('media', wrapped)
    return this.fetchForm('/v1/media/upload', form)
  }

  // Search
  async search(q: string, type: 'notes' | 'users' = 'notes', opts?: {limit?: number; cursor?: string}) {
    const params = new URLSearchParams({q, type})
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.cursor) params.set('cursor', opts.cursor)
    return this.fetchJson(`/v1/search?${params.toString()}`)
  }
}

function safeJson(text: string) {
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return {raw: text}
  }
}
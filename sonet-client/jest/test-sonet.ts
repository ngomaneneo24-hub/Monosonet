// Sonet Test Utilities - Replacing AT Protocol test-pds.ts

export interface TestSonet {
  sonetUrl: string
  mocker: SonetMocker
}

export interface SonetMocker {
  agent: SonetTestAgent
  createUser(username: string): Promise<SonetTestUser>
  createNote(content: string, author: string): Promise<SonetTestNote>
  followUser(follower: string, target: string): Promise<void>
}

export interface SonetTestAgent {
  api: {
    auth: {
      login(username: string, password: string): Promise<{accessToken: string}>
    }
    notes: {
      create(content: string, author: string): Promise<SonetTestNote>
    }
    users: {
      follow(targetUserId: string): Promise<void>
    }
  }
}

export interface SonetTestUser {
  id: string
  username: string
  displayName?: string
  bio?: string
}

export interface SonetTestNote {
  id: string
  content: string
  authorId: string
  createdAt: string
}

export async function createServer(options: {
  inviteRequired?: boolean
} = {}): Promise<TestSonet> {
  const port = Math.floor(Math.random() * 10000) + 10000
  const sonetUrl = `http://localhost:${port}`

  const mocker = new SonetMocker(sonetUrl)

  return {
    sonetUrl,
    mocker,
  }
}

class SonetMocker {
  private users: Map<string, SonetTestUser> = new Map()
  private notes: Map<string, SonetTestNote> = new Map()
  private follows: Map<string, Set<string>> = new Map()

  constructor(private sonetUrl: string) {}

  get agent(): SonetTestAgent {
    return {
      api: {
        auth: {
          login: async (username: string, password: string) => {
            const user = this.users.get(username)
            if (!user) {
              throw new Error('User not found')
            }
            return { accessToken: `mock-token-${user.id}` }
          }
        },
        notes: {
          create: async (content: string, author: string) => {
            const user = this.users.get(author)
            if (!user) {
              throw new Error('Author not found')
            }
            
            const note: SonetTestNote = {
              id: `note-${Date.now()}-${Math.random()}`,
              content,
              authorId: user.id,
              createdAt: new Date().toISOString(),
            }
            
            this.notes.set(note.id, note)
            return note
          }
        },
        users: {
          follow: async (targetUserId: string) => {
            if (!this.follows.has(targetUserId)) {
              this.follows.set(targetUserId, new Set())
            }
            this.follows.get(targetUserId)!.add('mock-follower')
          }
        }
      }
    }
  }

  async createUser(username: string): Promise<SonetTestUser> {
    const user: SonetTestUser = {
      id: `user-${Date.now()}-${Math.random()}`,
      username,
      displayName: username,
      bio: `Mock user ${username}`,
    }
    
    this.users.set(username, user)
    return user
  }

  async createNote(content: string, author: string): Promise<SonetTestNote> {
    return this.agent.api.notes.create(content, author)
  }

  async followUser(follower: string, target: string): Promise<void> {
    return this.agent.api.users.follow(target)
  }
}
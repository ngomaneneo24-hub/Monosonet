import type http from 'http'
import { WebSocketServer } from 'ws'
import jwt from 'jsonwebtoken'
import { GrpcClients } from '../grpc/clients.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production'

function getUserIdFromToken(token: string): string | null {
  try {
    const payload: any = jwt.verify(token, JWT_SECRET)
    return payload.sub || payload.user_id || payload.uid || null
  } catch {
    return null
  }
}

function parseUrl(url?: string): { pathname: string; query: URLSearchParams } {
  try {
    const u = new URL(url || '', 'http://localhost')
    return { pathname: u.pathname, query: u.searchParams }
  } catch {
    return { pathname: '/', query: new URLSearchParams() }
  }
}

export function registerMessageWebsocket(server: http.Server, clients: GrpcClients) {
  const wss = new WebSocketServer({ noServer: true })

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parseUrl(req.url)
    const isApiPath = pathname.startsWith('/api/v1/messages/ws')
    const isShortPath = pathname.startsWith('/messaging/ws')
    if (!isApiPath && !isShortPath) return

    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req)
    })
  })

  wss.on('connection', (ws, req) => {
    const { query, pathname } = parseUrl(req.url)
    let userId: string | null = null
    let chatFilter: string | null = null

    // Support /api/v1/messages/ws/:chatId and /messaging/ws/:chatId
    const parts = pathname.split('/').filter(Boolean)
    const maybeChatId = parts[parts.length - 1] && !parts[parts.length - 1].endsWith('ws') ? parts[parts.length - 1] : null
    if (maybeChatId && maybeChatId !== 'ws') chatFilter = maybeChatId

    const queryToken = query.get('token')
    if (queryToken) userId = getUserIdFromToken(queryToken)

    let grpcStream: any | null = null
    let isOpen = true

    function closeWith(code: number, reason: string) {
      try { ws.close(code, reason) } catch {}
    }

    function sendFrame(frame: any) {
      try { ws.send(JSON.stringify(frame)) } catch {}
    }

    function startGrpcStream() {
      if (!userId) return
      grpcStream = clients.messaging.StreamMessages()
      grpcStream.on('data', (msg: any) => {
        if (!isOpen) return
        try {
          if (msg.new_message) {
            sendFrame({ type: 'message', payload: grpcMessageToJson(msg.new_message) })
          } else if (msg.typing) {
            sendFrame({ type: 'typing', payload: grpcTypingToJson(msg.typing) })
          } else if (msg.read_receipt) {
            sendFrame({ type: 'read_receipt', payload: grpcReceiptToJson(msg.read_receipt) })
          } else if (msg.message_status_update) {
            sendFrame({ type: 'status_update', payload: msg.message_status_update })
          } else if (msg.heartbeat) {
            sendFrame({ type: 'heartbeat', timestamp: new Date().toISOString() })
          }
        } catch {}
      })
      grpcStream.on('error', () => { if (isOpen) closeWith(1011, 'Upstream error') })
      grpcStream.on('end', () => { if (isOpen) closeWith(1000, 'Upstream closed') })
      // Optionally write subscribe message to upstream
      // grpcStream.write({ subscribe: { user_id: userId, chat_id: chatFilter || '' }})
    }

    ws.on('message', data => {
      let msg: any
      try { msg = JSON.parse(String(data)) } catch { return }

      // Accept auth via message or query
      if (msg?.type === 'auth' && typeof msg.token === 'string') {
        userId = getUserIdFromToken(msg.token)
        if (!userId) return closeWith(1008, 'Invalid token')
        if (!grpcStream) startGrpcStream()
        return
      }
      if (!userId) return closeWith(1008, 'Unauthorized')

      // Heartbeat frames from client
      if (msg?.type === 'heartbeat') {
        return sendFrame({ type: 'heartbeat', timestamp: new Date().toISOString() })
      }

      // Forward signals to gRPC (support both enveloped and flat payloads)
      if (grpcStream) {
        if (msg?.type === 'typing') {
          const p = msg.payload || msg
          grpcStream.write({ typing: { chat_id: String(p.chat_id || chatFilter || ''), user_id: userId, is_typing: !!p.is_typing } })
        } else if (msg?.type === 'read_receipt') {
          const p = msg.payload || msg
          grpcStream.write({ read_receipt: { message_id: String(p.message_id || ''), user_id: userId } })
        }
      }
    })

    ws.on('close', () => {
      isOpen = false
      try { grpcStream?.end?.() } catch {}
      grpcStream = null
    })

    if (userId) startGrpcStream()
  })
}

function grpcMessageToJson(m: any) {
  return {
    id: m.message_id,
    chatId: m.chat_id,
    senderId: m.sender_id,
    content: m.content,
    type: enumToType(m.type),
    status: enumToStatus(m.status),
    isEncrypted: m.encryption && m.encryption !== 'ENCRYPTION_TYPE_NONE',
    attachments: m.attachments || [],
    replyTo: m.reply_to_message_id || undefined,
    timestamp: m.created_at?.iso || m.created_at || new Date().toISOString(),
    readBy: [],
    reactions: [],
  }
}

function enumToType(t: any) {
  switch (String(t || '').toUpperCase()) {
    case 'MESSAGE_TYPE_IMAGE': return 'image'
    case 'MESSAGE_TYPE_FILE': return 'file'
    default: return 'text'
  }
}
function enumToStatus(s: any) {
  switch (String(s || '').toUpperCase()) {
    case 'MESSAGE_STATUS_DELIVERED': return 'delivered'
    case 'MESSAGE_STATUS_READ': return 'read'
    case 'MESSAGE_STATUS_FAILED': return 'failed'
    default: return 'sent'
  }
}

function grpcTypingToJson(t: any) {
  return {
    chat_id: t.chat_id,
    user_id: t.user_id,
    is_typing: !!t.is_typing,
    timestamp: t.timestamp?.iso || t.timestamp || new Date().toISOString(),
  }
}

function grpcReceiptToJson(r: any) {
  return {
    message_id: r.message_id,
    user_id: r.user_id,
    read_at: r.read_at?.iso || r.read_at || new Date().toISOString(),
  }
}
import type {
  ChatBskyConvoDefs,
  ChatBskyActorDefs,
} from '@atproto/api'
import type {
  SonetMessage,
  SonetChat,
  SonetTypingIndicator,
  SonetReadReceipt,
} from '#/services/sonetMessagingApi'

// Convert AT Protocol conversation to Sonet chat
export function convertAtprotoConvoToSonet(
  atprotoConvo: ChatBskyConvoDefs.ConvoView,
): SonetChat {
  return {
    chat_id: atprotoConvo.id,
    name: atprotoConvo.members?.length === 2 
      ? atprotoConvo.members.find(m => m.did !== atprotoConvo.members![0].did)?.displayName || 'Direct Message'
      : atprotoConvo.members?.map(m => m.displayName || m.handle).join(', ') || 'Group Chat',
    description: '',
    type: atprotoConvo.members?.length === 2 ? 'direct' : 'group',
    creator_id: atprotoConvo.members?.[0]?.did || '',
    participant_ids: atprotoConvo.members?.map(m => m.did) || [],
    last_message_id: atprotoConvo.lastMessage?.id,
    last_activity: atprotoConvo.lastMessage?.sentAt || atprotoConvo.rev,
    is_archived: false,
    is_muted: atprotoConvo.muted || false,
    avatar_url: atprotoConvo.members?.length === 2 
      ? atprotoConvo.members.find(m => m.did !== atprotoConvo.members![0].did)?.avatar
      : undefined,
    settings: {},
    created_at: atprotoConvo.rev,
    updated_at: atprotoConvo.rev,
  }
}

// Convert Sonet chat to AT Protocol conversation (for backward compatibility)
export function convertSonetChatToAtproto(
  sonetChat: SonetChat,
): ChatBskyConvoDefs.ConvoView {
  return {
    id: sonetChat.chat_id,
    rev: sonetChat.updated_at,
    members: sonetChat.participant_ids.map(did => ({
      did,
      handle: did, // Placeholder - would need to fetch actual handle
      displayName: sonetChat.name,
      avatar: sonetChat.avatar_url,
    })),
    lastMessage: undefined, // Would need to be populated separately
    muted: sonetChat.is_muted,
    unreadCount: 0, // Would need to be calculated
  }
}

// Convert AT Protocol message to Sonet message
export function convertAtprotoMessageToSonet(
  atprotoMessage: ChatBskyConvoDefs.MessageView,
): SonetMessage {
  return {
    message_id: atprotoMessage.id,
    chat_id: atprotoMessage.convoId,
    sender_id: atprotoMessage.sender?.did || '',
    content: atprotoMessage.text,
    type: 'text', // AT Protocol messages are typically text
    status: atprotoMessage.state === 'sent' ? 'sent' : 
            atprotoMessage.state === 'delivered' ? 'delivered' :
            atprotoMessage.state === 'read' ? 'read' : 'failed',
    encryption: 'none', // AT Protocol doesn't have E2E encryption
    attachments: atprotoMessage.embeds?.map(embed => 
      embed.$type === 'app.bsky.embed.images' 
        ? embed.images?.map(img => img.fullsize) 
        : []
    ).flat() || [],
    reply_to_message_id: atprotoMessage.replyTo?.id,
    is_edited: atprotoMessage.editRecord !== undefined,
    created_at: atprotoMessage.sentAt,
    updated_at: atprotoMessage.sentAt,
    delivered_at: atprotoMessage.state === 'delivered' ? atprotoMessage.sentAt : undefined,
    read_at: atprotoMessage.state === 'read' ? atprotoMessage.sentAt : undefined,
  }
}

// Convert Sonet message to AT Protocol message (for backward compatibility)
export function convertSonetMessageToAtproto(
  sonetMessage: SonetMessage,
): ChatBskyConvoDefs.MessageView {
  return {
    id: sonetMessage.message_id,
    convoId: sonetMessage.chat_id,
    rev: sonetMessage.updated_at,
    text: sonetMessage.content,
    sender: {
      did: sonetMessage.sender_id,
      handle: sonetMessage.sender_id, // Placeholder
      displayName: '', // Would need to be populated
      avatar: '', // Would need to be populated
    },
    sentAt: sonetMessage.created_at,
    state: sonetMessage.status === 'sent' ? 'sent' :
           sonetMessage.status === 'delivered' ? 'delivered' :
           sonetMessage.status === 'read' ? 'read' : 'failed',
    embeds: sonetMessage.attachments?.length 
      ? [{ $type: 'app.bsky.embed.images', images: sonetMessage.attachments.map(url => ({ fullsize: url })) }]
      : [],
    replyTo: sonetMessage.reply_to_message_id ? { id: sonetMessage.reply_to_message_id } : undefined,
    editRecord: sonetMessage.is_edited ? { text: sonetMessage.content, indexedAt: sonetMessage.updated_at } : undefined,
  }
}

// Convert AT Protocol profile to Sonet user info
export function convertAtprotoProfileToSonetUser(
  profile: ChatBskyActorDefs.ProfileViewBasic,
): { user_id: string; username: string; display_name?: string; avatar_url?: string } {
  return {
    user_id: profile.did,
    username: profile.handle,
    display_name: profile.displayName,
    avatar_url: profile.avatar,
  }
}

// Convert Sonet user info to AT Protocol profile
export function convertSonetUserToAtprotoProfile(
  user: { user_id: string; username: string; display_name?: string; avatar_url?: string },
): ChatBskyActorDefs.ProfileViewBasic {
  return {
    did: user.user_id,
    handle: user.username,
    displayName: user.display_name,
    avatar: user.avatar_url,
  }
}

// Convert AT Protocol typing indicator to Sonet typing indicator
export function convertAtprotoTypingToSonet(
  typing: { convoId: string; sender: ChatBskyActorDefs.ProfileViewBasic; typing: boolean },
): SonetTypingIndicator {
  return {
    chat_id: typing.convoId,
    user_id: typing.sender.did,
    is_typing: typing.typing,
    timestamp: new Date().toISOString(),
  }
}

// Convert Sonet typing indicator to AT Protocol typing indicator
export function convertSonetTypingToAtproto(
  typing: SonetTypingIndicator,
): { convoId: string; sender: ChatBskyActorDefs.ProfileViewBasic; typing: boolean } {
  return {
    convoId: typing.chat_id,
    sender: {
      did: typing.user_id,
      handle: typing.user_id, // Placeholder
      displayName: '', // Would need to be populated
      avatar: '', // Would need to be populated
    },
    typing: typing.is_typing,
  }
}

// Convert AT Protocol read receipt to Sonet read receipt
export function convertAtprotoReadReceiptToSonet(
  receipt: { messageId: string; sender: ChatBskyActorDefs.ProfileViewBasic; readAt: string },
): SonetReadReceipt {
  return {
    message_id: receipt.messageId,
    user_id: receipt.sender.did,
    read_at: receipt.readAt,
  }
}

// Convert Sonet read receipt to AT Protocol read receipt
export function convertSonetReadReceiptToAtproto(
  receipt: SonetReadReceipt,
): { messageId: string; sender: ChatBskyActorDefs.ProfileViewBasic; readAt: string } {
  return {
    messageId: receipt.message_id,
    sender: {
      did: receipt.user_id,
      handle: receipt.user_id, // Placeholder
      displayName: '', // Would need to be populated
      avatar: '', // Would need to be populated
    },
    readAt: receipt.read_at,
  }
}
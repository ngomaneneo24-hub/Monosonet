export interface MessageReaction {
  id: string
  messageId: string
  chatId: string
  userId: string
  userName: string
  reactionType: string
  timestamp: string
}

export interface ReactionSummary {
  reactionType: string
  count: number
  users: string[]
  hasUserReacted: boolean
}

export class SonetReactions {
  private static readonly SUPPORTED_REACTIONS = [
    '👍', '👎', '❤️', '😄', '😢', '😡', '🎉', '🔥', '💯', '👏', '🙏', '🤔'
  ]

  // Add reaction to message
  static addReaction(
    messageId: string,
    chatId: string,
    userId: string,
    userName: string,
    reactionType: string
  ): MessageReaction {
    if (!this.SUPPORTED_REACTIONS.includes(reactionType)) {
      throw new Error(`Unsupported reaction type: ${reactionType}`)
    }

    const reaction: MessageReaction = {
      id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      messageId,
      chatId,
      userId,
      userName,
      reactionType,
      timestamp: new Date().toISOString()
    }

    console.log('Reaction added:', reaction)
    return reaction
  }

  // Remove reaction from message
  static removeReaction(
    messageId: string,
    userId: string,
    reactions: MessageReaction[]
  ): MessageReaction[] {
    return reactions.filter(reaction => 
      !(reaction.messageId === messageId && reaction.userId === userId)
    )
  }

  // Get reaction summary for a message
  static getReactionSummary(
    messageId: string,
    reactions: MessageReaction[],
    currentUserId: string
  ): ReactionSummary[] {
    const messageReactions = reactions.filter(r => r.messageId === messageId)
    const summary = new Map<string, ReactionSummary>()

    messageReactions.forEach(reaction => {
      if (!summary.has(reaction.reactionType)) {
        summary.set(reaction.reactionType, {
          reactionType: reaction.reactionType,
          count: 0,
          users: [],
          hasUserReacted: false
        })
      }

      const summaryItem = summary.get(reaction.reactionType)!
      summaryItem.count++
      summaryItem.users.push(reaction.userName)
      
      if (reaction.userId === currentUserId) {
        summaryItem.hasUserReacted = true
      }
    })

    return Array.from(summary.values())
  }

  // Check if user has reacted to a message
  static hasUserReacted(
    messageId: string,
    userId: string,
    reactions: MessageReaction[]
  ): boolean {
    return reactions.some(reaction => 
      reaction.messageId === messageId && reaction.userId === userId
    )
  }

  // Get user's reaction to a message
  static getUserReaction(
    messageId: string,
    userId: string,
    reactions: MessageReaction[]
  ): MessageReaction | null {
    return reactions.find(reaction => 
      reaction.messageId === messageId && reaction.userId === userId
    ) || null
  }

  // Get supported reaction types
  static getSupportedReactions(): string[] {
    return [...this.SUPPORTED_REACTIONS]
  }

  // Validate reaction type
  static isValidReaction(reactionType: string): boolean {
    return this.SUPPORTED_REACTIONS.includes(reactionType)
  }
}
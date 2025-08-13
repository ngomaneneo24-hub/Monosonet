import chunk from 'lodash.chunk'
import {sonetClient} from '@sonet/api'

export async function bulkWriteFollows(agent: any, userIds: string[]) {
  // Sonet simplified follow implementation
  const chunks = chunk(userIds, 50)
  const followUris = new Map()
  
  for (const chunk of chunks) {
    for (const userId of chunk) {
      try {
        await sonetClient.followUser(userId)
        followUris.set(userId, `sonet://user/${userId}/follow`)
      } catch (error) {
        console.error(`Failed to follow user ${userId}:`, error)
      }
    }
  }
  
  return followUris
}

import {useMemo} from 'react'

import {FeedTuner} from '#/lib/api/feed-manip'
import {type FeedDescriptor} from '../queries/note-feed'
import {usePreferencesQuery} from '../queries/preferences'
import {useSession} from '../session'
import {useLanguagePrefs} from './languages'

export function useFeedTuners(feedDesc: FeedDescriptor) {
  const langPrefs = useLanguagePrefs()
  const {data: preferences} = usePreferencesQuery()
  const {currentAccount} = useSession()

  return useMemo(() => {
    if (feedDesc.startsWith('author')) {
      if (feedDesc.endsWith('|notes_with_replies')) {
        // TODO: Do this on the server instead.
        return [FeedTuner.removeRenotes]
      }
    }
    if (feedDesc.startsWith('feedgen')) {
      return [
        FeedTuner.preferredLangOnly(langPrefs.contentLanguages),
        FeedTuner.removeMutedThreads,
      ]
    }
    if (feedDesc === 'following' || feedDesc.startsWith('list')) {
      const feedTuners = [FeedTuner.removeOrphans]

      if (preferences?.feedViewPrefs.hideRenotes) {
        feedTuners.push(FeedTuner.removeRenotes)
      }
      if (preferences?.feedViewPrefs.hideReplies) {
        feedTuners.push(FeedTuner.removeReplies)
      } else {
        feedTuners.push(
          FeedTuner.followedRepliesOnly({
            userDid: currentAccount?.userId || '',
          }),
        )
      }
      if (preferences?.feedViewPrefs.hideQuoteNotes) {
        feedTuners.push(FeedTuner.removeQuoteNotes)
      }
      feedTuners.push(FeedTuner.dedupThreads)
      feedTuners.push(FeedTuner.removeMutedThreads)

      return feedTuners
    }
    return []
  }, [feedDesc, currentAccount, preferences, langPrefs])
}

import {DEFAULT_LOGGED_OUT_LABEL_PREFERENCES} from '#/state/queries/preferences/moderation'
import {
  type ThreadViewPreferences,
  type UsePreferencesQueryResponse,
} from '#/state/queries/preferences/types'

export const DEFAULT_HOME_FEED_PREFS: UsePreferencesQueryResponse['feedViewPrefs'] =
  {
    hideReplies: false,
    hideRepliesByUnfollowed: true, // Legacy, ignored
    hideRepliesByLikeCount: 0, // Legacy, ignored
    hideRenotes: false,
    hideQuoteNotes: false,
    lab_mergeFeedEnabled: false, // experimental
  }

export const DEFAULT_THREAD_VIEW_PREFS: ThreadViewPreferences = {
  sort: 'hotness',
  prioritizeFollowedUsers: true,
  lab_treeViewEnabled: false,
}

export const DEFAULT_LOGGED_OUT_PREFERENCES: UsePreferencesQueryResponse = {
  birthDate: new Date('2022-11-17'), // TODO(pwi)
  moderationPrefs: {
    adultContentEnabled: false,
    labels: DEFAULT_LOGGED_OUT_LABEL_PREFERENCES,
    labelers: [],
    mutedWords: [],
    hiddenNotes: [],
  },
  feedViewPrefs: DEFAULT_HOME_FEED_PREFS,
  threadViewPrefs: DEFAULT_THREAD_VIEW_PREFS,
  userAge: 13, // TODO(pwi)
  interests: {tags: []},
  savedFeeds: [],
  bskyAppState: {
    queuedNudges: [],
    activeProgressGuide: undefined,
    nuxs: [],
  },
  noteInteractionSettings: {
    threadgateAllowRules: undefined,
    notegateEmbeddingRules: [],
  },
  verificationPrefs: {
    hideBadges: false,
  },
}

// Minimal runtime shim for '@atproto/api' to support Sonet migration
// All exports are intentionally loose and should be removed as Sonet migration completes.

export type Did = string

export class AtUri {
  uri: string
  host: string
  hostname: string
  href: string
  rkey: string
  constructor(uri: string) {
    this.uri = uri
    this.href = uri
    let host = ''
    let rkey = ''
    try {
      const body = uri.includes('://') ? uri.split('://')[1] : uri
      const parts = body.split('/').filter(Boolean)
      host = parts[0] || ''
      rkey = parts[parts.length - 1] || ''
    } catch {}
    this.host = host
    this.hostname = host
    this.rkey = rkey
  }
  static make(hostOrUri: string, collection?: string, rkey?: string): AtUri {
    if (collection && rkey) {
      return new AtUri(`at://${hostOrUri}/${collection}/${rkey}`)
    }
    return new AtUri(hostOrUri)
  }
  toString() {
    return this.uri
  }
}

// Augment BskyAgent with static placeholders used by code
export class BskyAgent {
  static appLabelers: any = {}
  static configure(): void {}
  constructor(..._args: any[]) {}
  [key: string]: any
}

// Value and namespace placeholders
export const AppBskyActorDefs: any = {}
export namespace AppBskyActorDefs {
  export type ProfileViewBasic = any
  export type ProfileView = any
  export type ProfileViewDetailed = any
  export type KnownFollowers = any
  export type ViewerState = any
}
export const AppBskyFeedDefs: any = {}
export namespace AppBskyFeedDefs {
  export type FeedViewPost = any
  export type ThreadViewPost = any
  export type PostView = any
  export type ReasonRepost = any
  export type ViewerState = any
}
export const AppBskyGraphDefs: any = {}
export namespace AppBskyGraphDefs {
  export type ListView = any
  export type ListItemView = any
}
export const AppBskyEmbedImages: any = {}
export namespace AppBskyEmbedImages {
  export type View = any
}
export const AppBskyVideoDefs: any = {}
export namespace AppBskyVideoDefs {
  export type JobStatus = any
}

// Additional commonly imported members (as namespaces)
export type AppBskyFeedPost = any
export namespace AppBskyFeedPost { export type Record = any }
export type AppBskyFeedGetPostThread = any
export namespace AppBskyFeedGetPostThread { export type OutputSchema = any }
export type AppBskyFeedThreadgate = any
export namespace AppBskyFeedThreadgate { export type Record = any }
export type AppBskyFeedGetLikes = any
export namespace AppBskyFeedGetLikes { export type OutputSchema = any }
export type AppBskyFeedGetAuthorFeed = any
export namespace AppBskyFeedGetAuthorFeed { export type OutputSchema = any }
export type AppBskyFeedGetSuggestedFeeds = any
export namespace AppBskyFeedGetSuggestedFeeds { export type OutputSchema = any }
export type AppBskyActorGetProfile = any
export namespace AppBskyActorGetProfile { export type OutputSchema = any }
export type AppBskyActorGetProfiles = any
export namespace AppBskyActorGetProfiles { export type OutputSchema = any }
export type AppBskyActorGetSuggestions = any
export namespace AppBskyActorGetSuggestions { export type OutputSchema = any }
export type AppBskyGraphGetFollowers = any
export namespace AppBskyGraphGetFollowers { export type OutputSchema = any }
export type AppBskyGraphGetFollows = any
export namespace AppBskyGraphGetFollows { export type OutputSchema = any }
export type AppBskyGraphGetLists = any
export namespace AppBskyGraphGetLists { export type OutputSchema = any }
export type AppBskyGraphGetStarterPack = any
export namespace AppBskyGraphGetStarterPack { export type OutputSchema = any }
export type AppBskyGraphStarterpack = any
export namespace AppBskyGraphStarterpack { export type Record = any }
export type AppBskyEmbedRecord = any
export namespace AppBskyEmbedRecord { export type View = any }
export type AppBskyEmbedRecordWithMedia = any
export namespace AppBskyEmbedRecordWithMedia { export type View = any }
export type AppBskyEmbedExternal = any
export namespace AppBskyEmbedExternal { export type View = any }
export type AppBskyEmbedVideo = any
export namespace AppBskyEmbedVideo { export type View = any }
export type AppBskyUnspeccedDefs = any
export type AppBskyUnspeccedGetPostThreadV2 = any
export namespace AppBskyUnspeccedGetPostThreadV2 { export type OutputSchema = any }
export type AppBskyUnspeccedGetPostThreadOtherV2 = any
export namespace AppBskyUnspeccedGetPostThreadOtherV2 { export type OutputSchema = any }
export type AppBskyUnspeccedGetSuggestedUsers = any
export namespace AppBskyUnspeccedGetSuggestedUsers { export type OutputSchema = any }
export type AppBskyUnspeccedGetTrends = any
export namespace AppBskyUnspeccedGetTrends { export type OutputSchema = any }
export type AppBskyFeedGetQuotes = any
export namespace AppBskyFeedGetQuotes { export type OutputSchema = any }
export type AppBskyFeedGetRepostedBy = any
export namespace AppBskyFeedGetRepostedBy { export type OutputSchema = any }
export type AppBskyGraphFollow = any

export const URL_REGEX = /https?:\/\/\S+/i
export const DEFAULT_LABEL_SETTINGS: any = {}
export function interpretLabelValueDefinitions(): any { return {} }
export const ComAtprotoLabelDefs: any = {}
export namespace ComAtprotoLabelDefs { export type Label = any }
export function interpretLabelValueDefinition(): any { return {} }
export const LabelPreference: any = {}
export type LabelPreference = any
export const LABELS: any = {}
export const mock: any = {}
export const ModerationBehavior: any = {}
export type ModerationOpts = any
export const moderatePost: any = () => ({})
export const moderateUserList: any = () => ({})
export const moderateFeedGenerator: any = () => ({})
export const BSKY_LABELER_DID = 'did:example:labeler'

export type BskyPreferences = any
export type BskyFeedViewPreference = any
export type BskyThreadViewPreference = any

export const $Typed: any = {}
export type $Typed = any
export const Un$Typed: any = {}
export type Un$Typed = any

export class RichText {
  text = ''
  facets: any[] | undefined
  unicodeText: string = ''
  get length(): number { return this.text.length }
  get graphemeLength(): number { return this.text.length }
  segments: any[] = []
  constructor(opts?: any) {
    if (opts?.text) {
      this.text = String(opts.text)
      this.unicodeText = this.text
    }
  }
  async detectFacets(_agent?: any): Promise<void> { this.facets = this.facets || [] }
  async detectFacetsWithoutResolution(_agent?: any): Promise<void> { this.facets = this.facets || [] }
}

export const ComAtprotoRepoUploadBlob: any = {}
export const ComAtprotoServerDescribeServer: any = {}
export const ComAtprotoServerDefs: any = {}
export const AppBskyFeedPostgate: any = {}

export const moderateProfile: any = () => ({})

export const TAG_REGEX = /#[\p{L}\p{N}_]+/gu
export const TRAILING_PUNCTUATION_REGEX = /[\p{P}\p{S}]+$/u

export type ModerationDecision = any
export type ModerationUI = any
export type ModerationPrefs = any

export type BlobRef = any

export const Agent: any = {}
export const ComAtprotoTempCheckHandleAvailability: any = {}
export const Facet: any = {}
export const ComAtprotoRepoApplyWrites: any = {}

export const AppBskyLabelerDefs: any = {}
export const AppBskyNotificationDefs: any = {}
export const AppBskyNotificationListNotifications: any = {}
export namespace AppBskyNotificationListNotifications { export type OutputSchema = any }

export const AppBskyFeedLike: any = {}
export const AppBskyFeedRepost: any = {}

export const ChatBskyConvoDefs: any = {}
export const ChatBskyConvoListConvos: any = {}
export const ChatBskyConvoGetConvoForMembers: any = {}
export const ChatBskyConvoLeaveConvo: any = {}
export const ChatBskyConvoAcceptConvo: any = {}
export const ChatBskyConvoMuteConvo: any = {}

export const nuxSchema: any = {}

// Add many specific nested names used around the app
export namespace AppBskyActorDefs {
  export type SavedFeed = any
  export type VerificationView = any
  export type VerificationPrefs = any
  export type PostInteractionSettingsPref = any
  export type MutedWord = any
  export type BskyAppProgressGuide = any
  export type Nux = any
}

export namespace AppBskyFeedDefs {
  export type GeneratorView = any
  export type Interaction = any
  export type ReasonPin = any
  export type ThreadgateView = any
}

export namespace AppBskyGraphDefs {
  export type StarterPackView = any
  export type StarterPackViewBasic = any
  export type ListViewBasic = any
  export type ListPurpose = any
}

export namespace AppBskyEmbedImages {
  export type ViewImage = any
}

export namespace AppBskyActorGetProfile {
  export type Response = any
}
export namespace AppBskyActorGetProfiles {
  export type Response = any
}
export namespace AppBskyFeedGetAuthorFeed {
  export type Response = any
}
export namespace AppBskyFeedGetPostThread {
  export type Response = any
}
export namespace AppBskyGraphGetStarterPack {
  export type Response = any
}
export namespace AppBskyUnspeccedGetPostThreadV2 {
  export type QueryParams = any
  export type ThreadItem = any
}
export namespace AppBskyUnspeccedGetPostThreadOtherV2 {
  export type QueryParams = any
  export type ThreadItem = any
}
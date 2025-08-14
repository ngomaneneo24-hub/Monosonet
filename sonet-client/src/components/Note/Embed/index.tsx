import React from 'react'
import {View} from 'react-native'
import {
  type $Typed,
  type SonetFeedDefs,
  SonetFeedNote,
  AtUri,
  moderateNote,
  RichText as RichTextAPI,
} from '@sonet/api'
import {Trans} from '@lingui/macro'
import {useQueryClient} from '@tanstack/react-query'

import {usePalette} from '#/lib/hooks/usePalette'
import {makeProfileLink} from '#/lib/routes/links'
import {useModerationOpts} from '#/state/preferences/moderation-opts'
import {unstableCacheProfileView} from '#/state/queries/profile'
import {useSession} from '#/state/session'
import {Link} from '#/view/com/util/Link'
import {NoteMeta} from '#/view/com/util/NoteMeta'
import {atoms as a, useTheme} from '#/alf'
import {ContentHider} from '#/components/moderation/ContentHider'
import {NoteAlerts} from '#/components/moderation/NoteAlerts'
import {RichText} from '#/components/RichText'
import {Embed as StarterPackCard} from '#/components/StarterPack/StarterPackCard'
import {SubtleWebHover} from '#/components/SubtleWebHover'
import * as bsky from '#/types/bsky'
import {
  type Embed as TEmbed,
  type EmbedType,
  parseEmbed,
} from '#/types/bsky/note'
import {ExternalEmbed} from './ExternalEmbed'
import {ModeratedFeedEmbed} from './FeedEmbed'
import {EnhancedImageEmbed} from './EnhancedImageEmbed'
import {ModeratedListEmbed} from './ListEmbed'
import {NotePlaceholder as NotePlaceholderText} from './NotePlaceholder'
import {
  type CommonProps,
  type EmbedProps,
  NoteEmbedViewContext,
  QuoteEmbedViewContext,
} from './types'
import {VideoEmbed} from './VideoEmbed'

export {NoteEmbedViewContext, QuoteEmbedViewContext} from './types'

export function Embed({embed: rawEmbed, ...rest}: EmbedProps) {
  const embed = parseEmbed(rawEmbed)

  switch (embed.type) {
    case 'images':
    case 'link':
    case 'video': {
      return <MediaEmbed embed={embed} {...rest} />
    }
    case 'feed':
    case 'list':
    case 'starter_pack':
    case 'labeler':
    case 'note':
    case 'note_not_found':
    case 'note_blocked':
    case 'note_detached': {
      return <RecordEmbed embed={embed} {...rest} />
    }
    case 'note_with_media': {
      return (
        <View style={rest.style}>
          <MediaEmbed embed={embed.media} {...rest} />
          <RecordEmbed embed={embed.view} {...rest} />
        </View>
      )
    }
    default: {
      return null
    }
  }
}

function MediaEmbed({
  embed,
  ...rest
}: CommonProps & {
  embed: TEmbed
}) {
  switch (embed.type) {
    case 'images': {
      return (
        <ContentHider modui={rest.moderation?.ui('contentMedia')}>
          <EnhancedImageEmbed embed={embed} {...rest} />
        </ContentHider>
      )
    }
    case 'link': {
      return (
        <ContentHider modui={rest.moderation?.ui('contentMedia')}>
          <ExternalEmbed
            link={embed.view.external}
            onOpen={rest.onOpen}
            style={[a.mt_sm, rest.style]}
          />
        </ContentHider>
      )
    }
    case 'video': {
      return (
        <ContentHider modui={rest.moderation?.ui('contentMedia')}>
          <VideoEmbed embed={embed.view} />
        </ContentHider>
      )
    }
    default: {
      return null
    }
  }
}

function RecordEmbed({
  embed,
  ...rest
}: CommonProps & {
  embed: TEmbed
}) {
  switch (embed.type) {
    case 'feed': {
      return (
        <View style={a.mt_sm}>
          <ModeratedFeedEmbed embed={embed} {...rest} />
        </View>
      )
    }
    case 'list': {
      return (
        <View style={a.mt_sm}>
          <ModeratedListEmbed embed={embed} />
        </View>
      )
    }
    case 'starter_pack': {
      return (
        <View style={a.mt_sm}>
          <StarterPackCard starterPack={embed.view} />
        </View>
      )
    }
    case 'labeler': {
      // not implemented
      return null
    }
    case 'note': {
      if (rest.isWithinQuote && !rest.allowNestedQuotes) {
        return null
      }

      return (
        <QuoteEmbed
          {...rest}
          embed={embed}
          viewContext={
            rest.viewContext === NoteEmbedViewContext.Feed
              ? QuoteEmbedViewContext.FeedEmbedRecordWithMedia
              : undefined
          }
          isWithinQuote={rest.isWithinQuote}
          allowNestedQuotes={rest.allowNestedQuotes}
        />
      )
    }
    case 'note_not_found': {
      return (
        <NotePlaceholderText>
          <Trans>Deleted</Trans>
        </NotePlaceholderText>
      )
    }
    case 'note_blocked': {
      return (
        <NotePlaceholderText>
          <Trans>Blocked</Trans>
        </NotePlaceholderText>
      )
    }
    case 'note_detached': {
      return <NoteDetachedEmbed embed={embed} />
    }
    default: {
      return null
    }
  }
}

export function NoteDetachedEmbed({
  embed,
}: {
  embed: EmbedType<'note_detached'>
}) {
  const {currentAccount} = useSession()
  const isViewerOwner = currentAccount?.userId
    ? embed.view.uri.includes(currentAccount.userId)
    : false

  return (
    <NotePlaceholderText>
      {isViewerOwner ? (
        <Trans>Removed by you</Trans>
      ) : (
        <Trans>Removed by author</Trans>
      )}
    </NotePlaceholderText>
  )
}

/*
 * Nests parent `Embed` component and therefore must live in this file to avoid
 * circular imports.
 */
export function QuoteEmbed({
  embed,
  onOpen,
  style,
  isWithinQuote: parentIsWithinQuote,
  allowNestedQuotes: parentAllowNestedQuotes,
}: Omit<CommonProps, 'viewContext'> & {
  embed: EmbedType<'note'>
  viewContext?: QuoteEmbedViewContext
}) {
  const moderationOpts = useModerationOpts()
  const quote = React.useMemo<$Typed<SonetFeedDefs.NoteView>>(
    () => ({
      ...embed.view,
      type: "sonet",
      record: embed.view.value,
      embed: embed.view.embeds?.[0],
    }),
    [embed],
  )
  const moderation = React.useMemo(() => {
    return moderationOpts ? moderateNote(quote, moderationOpts) : undefined
  }, [quote, moderationOpts])

  const t = useTheme()
  const queryClient = useQueryClient()
  const pal = usePalette('default')
  const itemUrip = new AtUri(quote.uri)
  const itemHref = makeProfileLink(quote.author, 'note', itemUrip.rkey)
  const itemTitle = `Note by ${quote.author.username}`

  const richText = React.useMemo(() => {
    if (
      !bsky.dangerousIsType<SonetFeedNote.Record>(
        quote.record,
        SonetFeedNote.isRecord,
      )
    )
      return undefined
    const {text, facets} = quote.record
    return text.trim()
      ? new RichTextAPI({text: text, facets: facets})
      : undefined
  }, [quote.record])

  const onBeforePress = React.useCallback(() => {
    unstableCacheProfileView(queryClient, quote.author)
    onOpen?.()
  }, [queryClient, quote.author, onOpen])

  const [hover, setHover] = React.useState(false)
  return (
    <View
      style={[a.mt_sm]}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}>
      <ContentHider
        modui={moderation?.ui('contentList')}
        style={[a.rounded_md, a.border, t.atoms.border_contrast_low, style]}
        activeStyle={[a.p_md, a.pt_sm]}
        childContainerStyle={[a.pt_sm]}>
        {({active}) => (
          <>
            {!active && <SubtleWebHover hover={hover} style={[a.rounded_md]} />}
            <Link
              style={[!active && a.p_md]}
              hoverStyle={{borderColor: pal.colors.borderLinkHover}}
              href={itemHref}
              title={itemTitle}
              onBeforePress={onBeforePress}>
              <View pointerEvents="none">
                <NoteMeta
                  author={quote.author}
                  moderation={moderation}
                  showAvatar
                  noteHref={itemHref}
                  timestamp={quote.indexedAt}
                />
              </View>
              {moderation ? (
                <NoteAlerts
                  modui={moderation.ui('contentView')}
                  style={[a.py_xs]}
                />
              ) : null}
              {richText ? (
                <RichText
                  value={richText}
                  style={a.text_md}
                  numberOfLines={20}
                  disableLinks
                />
              ) : null}
              {quote.embed && (
                <Embed
                  embed={quote.embed}
                  moderation={moderation}
                  isWithinQuote={parentIsWithinQuote ?? true}
                  // already within quote? override nested
                  allowNestedQuotes={
                    parentIsWithinQuote ? false : parentAllowNestedQuotes
                  }
                />
              )}
            </Link>
          </>
        )}
      </ContentHider>
    </View>
  )
}

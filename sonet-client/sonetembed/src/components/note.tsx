import {
  AppBskyFeedDefs,
  AppBskyFeedNote,
  AppBskyRichtextFacet,
  RichText,
} from '@atproto/api'
import {h} from 'preact'

import replyIcon from '../../assets/bubble_filled_stroke2_corner2_rounded.svg'
import likeIcon from '../../assets/heart2_filled_stroke2_corner0_rounded.svg'
import logo from '../../assets/logo.svg'
import renoteIcon from '../../assets/renote_stroke2_corner2_rounded.svg'
import {CONTENT_LABELS} from '../labels'
import {getRkey, niceDate, prettyNumber} from '../utils'
import {Container} from './container'
import {Embed} from './embed'
import {Link} from './link'

interface Props {
  thread: AppBskyFeedDefs.ThreadViewNote
}

export function Note({thread}: Props) {
  const note = thread.note

  const isAuthorLabeled = note.author.labels?.some(label =>
    CONTENT_LABELS.includes(label.val),
  )

  let record: AppBskyFeedNote.Record | null = null
  if (AppBskyFeedNote.isRecord(note.record)) {
    record = note.record
  }

  const href = `/profile/${note.author.did}/note/${getRkey(note)}`
  return (
    <Container href={href}>
      <div className="flex-1 flex-col flex gap-2" lang={record?.langs?.[0]}>
        <div className="flex gap-2.5 items-center cursor-pointer">
          <Link href={`/profile/${note.author.did}`} className="rounded-full">
            <div className="w-10 h-10 overflow-hidden rounded-full bg-neutral-300 dark:bg-slate-700 shrink-0">
              <img
                src={note.author.avatar}
                style={isAuthorLabeled ? {filter: 'blur(2.5px)'} : undefined}
              />
            </div>
          </Link>
          <div>
            <Link
              href={`/profile/${note.author.did}`}
              className="font-bold text-[17px] leading-5 line-clamp-1 hover:underline underline-offset-2 decoration-2">
              <p>{note.author.displayName}</p>
            </Link>
            <Link
              href={`/profile/${note.author.did}`}
              className="text-[15px] text-textLight dark:text-textDimmed hover:underline line-clamp-1">
              <p>@{note.author.handle}</p>
            </Link>
          </div>
          <div className="flex-1" />
          <Link
            href={href}
            className="transition-transform hover:scale-110 shrink-0 self-start">
            <img src={logo} className="h-8" />
          </Link>
        </div>
        <NoteContent record={record} />
        <Embed content={note.embed} labels={note.labels} />
        <Link href={href}>
          <time
            datetime={new Date(note.indexedAt).toISOString()}
            className="text-textLight dark:text-textDimmed mt-1 text-sm hover:underline">
            {niceDate(note.indexedAt)}
          </time>
        </Link>
        <div className="border-t dark:border-slate-600 w-full pt-2.5 flex items-center gap-5 text-sm cursor-pointer">
          {!!note.likeCount && (
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={likeIcon} className="w-5 h-5" />
              <p className="font-bold text-neutral-500 dark:text-neutral-300 mb-px">
                {prettyNumber(note.likeCount)}
              </p>
            </div>
          )}
          {!!note.renoteCount && (
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={renoteIcon} className="w-5 h-5" />
              <p className="font-bold text-neutral-500 dark:text-neutral-300 mb-px">
                {prettyNumber(note.renoteCount)}
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 cursor-pointer">
            <img src={replyIcon} className="w-5 h-5" />
            <p className="font-bold text-neutral-500 dark:text-neutral-300 mb-px">
              Reply
            </p>
          </div>
          <div className="flex-1" />
          <p className="cursor-pointer text-brand dark:text-brandLighten font-bold hover:underline hidden min-[450px]:inline">
            {note.replyCount
              ? `Read ${prettyNumber(note.replyCount)} ${
                  note.replyCount > 1 ? 'replies' : 'reply'
                } on Bluesky`
              : `View on Bluesky`}
          </p>
          <p className="cursor-pointer text-brand font-bold hover:underline min-[450px]:hidden">
            <span className="hidden min-[380px]:inline">View on </span>Bluesky
          </p>
        </div>
      </div>
    </Container>
  )
}

function NoteContent({record}: {record: AppBskyFeedNote.Record | null}) {
  if (!record) return null

  const rt = new RichText({
    text: record.text,
    facets: record.facets,
  })

  const richText = []

  let counter = 0
  for (const segment of rt.segments()) {
    if (
      segment.link &&
      AppBskyRichtextFacet.validateLink(segment.link).success
    ) {
      richText.push(
        <Link
          key={counter}
          href={segment.link.uri}
          className="text-blue-400 hover:underline"
          disableTracking={
            !segment.link.uri.startsWith('https://bsky.app') &&
            !segment.link.uri.startsWith('https://go.bsky.app')
          }>
          {segment.text}
        </Link>,
      )
    } else if (
      segment.mention &&
      AppBskyRichtextFacet.validateMention(segment.mention).success
    ) {
      richText.push(
        <Link
          key={counter}
          href={`/profile/${segment.mention.did}`}
          className="text-blue-500 hover:underline">
          {segment.text}
        </Link>,
      )
    } else if (
      segment.tag &&
      AppBskyRichtextFacet.validateTag(segment.tag).success
    ) {
      richText.push(
        <Link
          key={counter}
          href={`/hashtag/${segment.tag.tag}`}
          className="text-blue-500 hover:underline">
          {segment.text}
        </Link>,
      )
    } else {
      richText.push(segment.text)
    }

    counter++
  }

  return (
    <p className="min-[300px]:text-lg leading-6 min-[300px]:leading-6 break-word break-words whitespace-pre-wrap">
      {richText}
    </p>
  )
}

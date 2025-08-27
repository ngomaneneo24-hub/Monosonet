import {
  SonetActorDefs,
  SonetFeedDefs,
  SonetFeedNote,
  SonetGraphDefs,
} from '@sonet/api'

import {
  ParsedReportSubject,
  ReportSubject,
} from '#/components/moderation/ReportDialog/types'
import * as bsky from '#/types/bsky'

export function parseReportSubject(
  subject: ReportSubject,
): ParsedReportSubject | undefined {
  if (!subject) return

  if ('convoId' in subject) {
    return {
      type: 'chatMessage',
      ...subject,
    }
  }

  if (
    SonetActorDefs.isProfileViewBasic(subject) ||
    SonetActorDefs.isProfileView(subject) ||
    SonetActorDefs.isProfileViewDetailed(subject)
  ) {
    return {
      type: 'account',
      userId: subject.userId,
      nsid: 'app.sonet.actor.profile',
    }
  } else if (SonetGraphDefs.isListView(subject)) {
    return {
      type: 'list',
      uri: subject.uri,
      cid: subject.cid,
      nsid: 'app.sonet.graph.list',
    }
  } else if (SonetFeedDefs.isGeneratorView(subject)) {
    return {
      type: 'feed',
      uri: subject.uri,
      cid: subject.cid,
      nsid: 'app.sonet.feed.generator',
    }
  } else if (SonetGraphDefs.isStarterPackView(subject)) {
    return {
      type: 'starterPack',
      uri: subject.uri,
      cid: subject.cid,
      nsid: 'app.sonet.graph.starterPack',
    }
  } else if (SonetFeedDefs.isNoteView(subject)) {
    const record = subject.record
    const embed = bsky.note.parseEmbed(subject.embed)
    if (
      bsky.dangerousIsType<SonetFeedNote.Record>(
        record,
        SonetFeedNote.isRecord,
      )
    ) {
      return {
        type: 'note',
        uri: subject.uri,
        cid: subject.cid,
        authorUserId: subject.author?.id,
        nsid: 'app.sonet.feed.note',
        attributes: {
          reply: !!record.reply,
          image:
            embed.type === 'images' ||
            (embed.type === 'note_with_media' && embed.media.type === 'images'),
          video:
            embed.type === 'video' ||
            (embed.type === 'note_with_media' && embed.media.type === 'video'),
          link:
            embed.type === 'link' ||
            (embed.type === 'note_with_media' && embed.media.type === 'link'),
          quote:
            embed.type === 'note' ||
            (embed.type === 'note_with_media' &&
              (embed.view.type === 'note' ||
                embed.view.type === 'note_with_media')),
        },
      }
    }
  }
}

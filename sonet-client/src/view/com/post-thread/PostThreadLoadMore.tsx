import * as React from 'react'
import {View} from 'react-native'
import {SonetFeedDefs, AtUri} from '@sonet/api'
import {Trans} from '@lingui/macro'

import {makeProfileLink} from '#/lib/routes/links'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {Link} from '../util/Link'
import {UserAvatar} from '../util/UserAvatar'

export function NoteThreadLoadMore({note}: {note: SonetFeedDefs.NoteView}) {
  const t = useTheme()

  const noteHref = React.useMemo(() => {
    const urip = new AtUri(note.uri)
    return makeProfileLink(note.author, 'note', urip.rkey)
  }, [note.uri, note.author])

  return (
    <Link
      href={noteHref}
      style={[a.flex_row, a.align_center, a.py_md, {paddingHorizontal: 14}]}
      hoverStyle={[t.atoms.bg_contrast_25]}>
      <View style={[a.flex_row]}>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 18,
            backgroundColor: t.atoms.bg.backgroundColor,
            marginRight: -20,
          }}>
          <UserAvatar
            avatar={note.author.avatar}
            size={30}
            type={note.author.associated?.labeler ? 'labeler' : 'user'}
          />
        </View>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: 18,
            backgroundColor: t.atoms.bg.backgroundColor,
          }}>
          <UserAvatar
            avatar={note.author.avatar}
            size={30}
            type={note.author.associated?.labeler ? 'labeler' : 'user'}
          />
        </View>
      </View>
      <View style={[a.px_sm]}>
        <Text style={[{color: t.palette.primary_500}, a.text_md]}>
          <Trans>Continue thread...</Trans>
        </Text>
      </View>
    </Link>
  )
}

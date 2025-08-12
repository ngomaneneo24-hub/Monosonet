import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {type ThreadItem} from '#/state/queries/useNoteThread/types'
import {
  LINEAR_AVI_WIDTH,
  OUTER_SPACE,
  REPLY_LINE_WIDTH,
} from '#/screens/NoteThread/const'
import {atoms as a, useTheme} from '#/alf'
import {Lock_Stroke2_Corner0_Rounded as LockIcon} from '#/components/icons/Lock'
import * as Skele from '#/components/Skeleton'
import {Text} from '#/components/Typography'

export function ThreadItemNoteNoUnauthenticated({
  item,
}: {
  item: Extract<ThreadItem, {type: 'threadNoteNoUnauthenticated'}>
}) {
  const t = useTheme()

  return (
    <View style={[{paddingHorizontal: OUTER_SPACE}]}>
      <View style={[a.flex_row, {height: 12}]}>
        <View style={{width: LINEAR_AVI_WIDTH}}>
          {item.ui.showParentReplyLine && (
            <View
              style={[
                a.mx_auto,
                a.flex_1,
                a.mb_xs,
                {
                  width: REPLY_LINE_WIDTH,
                  backgroundColor: t.atoms.border_contrast_low.borderColor,
                },
              ]}
            />
          )}
        </View>
      </View>
      <Skele.Row style={[a.align_center, a.gap_md]}>
        <Skele.Circle size={LINEAR_AVI_WIDTH}>
          <LockIcon size="md" fill={t.atoms.text_contrast_medium.color} />
        </Skele.Circle>

        <Text style={[a.text_md, a.italic, t.atoms.text_contrast_medium]}>
          <Trans>You must sign in to view this note.</Trans>
        </Text>
      </Skele.Row>
      <View
        style={[
          a.flex_row,
          a.justify_center,
          {
            height: OUTER_SPACE / 1.5,
            width: LINEAR_AVI_WIDTH,
          },
        ]}>
        {item.ui.showChildReplyLine && (
          <View
            style={[
              a.mt_xs,
              a.h_full,
              {
                width: REPLY_LINE_WIDTH,
                backgroundColor: t.atoms.border_contrast_low.borderColor,
              },
            ]}
          />
        )}
      </View>
    </View>
  )
}

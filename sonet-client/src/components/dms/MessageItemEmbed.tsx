import React from 'react'
import {useWindowDimensions, View} from 'react-native'
import {type $Typed, type SonetEmbedRecord} from '@sonet/api'

import {atoms as a, native, tokens, useTheme, web} from '#/alf'
import {NoteEmbedViewContext} from '#/components/Note/Embed'
import {Embed} from '#/components/Note/Embed'
import {MessageContextProvider} from './MessageContext'

let MessageItemEmbed = ({
  embed,
}: {
  embed: $Typed<SonetEmbedRecord.View>
}): React.ReactNode => {
  const t = useTheme()
  const screen = useWindowDimensions()

  return (
    <MessageContextProvider>
      <View
        style={[
          a.my_xs,
          t.atoms.bg,
          a.rounded_md,
          native({
            flexBasis: 0,
            width: Math.min(screen.width, 600) / 1.4,
          }),
          web({
            width: '100%',
            minWidth: 280,
            maxWidth: 360,
          }),
        ]}>
        <View style={{marginTop: tokens.space.sm * -1}}>
          <Embed
            embed={embed}
            allowNestedQuotes
            viewContext={NoteEmbedViewContext.Feed}
          />
        </View>
      </View>
    </MessageContextProvider>
  )
}
MessageItemEmbed = React.memo(MessageItemEmbed)
export {MessageItemEmbed}

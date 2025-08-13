import {useMemo} from 'react'
import {View} from 'react-native'

import {createEmbedViewRecordFromNote} from '#/state/queries/notegate/util'
import {useResolveLinkQuery} from '#/state/queries/resolve-link'
import {atoms as a, useTheme} from '#/alf'
import {QuoteEmbed} from '#/components/Note/Embed'

export function LazyQuoteEmbed({uri}: {uri: string}) {
  const t = useTheme()
  const {data} = useResolveLinkQuery(uri)

  const view = useMemo(() => {
    if (!data || data.type !== 'record' || data.kind !== 'note') return
    return createEmbedViewRecordFromNote(data.view)
  }, [data])

  return view ? (
    <QuoteEmbed
      embed={{
        type: 'note',
        view,
      }}
    />
  ) : (
    <View
      style={[
        a.w_full,
        a.rounded_md,
        t.atoms.bg_contrast_25,
        {
          height: 68,
        },
      ]}
    />
  )
}

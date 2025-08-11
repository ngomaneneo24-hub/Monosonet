import React from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {toNiceDomain} from '#/lib/strings/url-helpers'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'

export function HostingProvider({serviceUrl}: {serviceUrl: string}) {
  const t = useTheme()
  return (
    <View style={[a.flex_row, a.align_center, a.flex_wrap, a.gap_xs]}>
      <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
        <Trans>Service</Trans>
      </Text>
      <Text style={[a.text_sm]}>{toNiceDomain(serviceUrl)}</Text>
    </View>
  )
}

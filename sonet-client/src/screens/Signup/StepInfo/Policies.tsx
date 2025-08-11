import {type ReactElement} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {atoms as a, useTheme} from '#/alf'
import {InlineLinkText} from '#/components/Link'
import {Text} from '#/components/Typography'
import {Admonition} from '#/components/Admonition'

export const Policies = ({
  serviceDescription,
  needsGuardian,
  under13,
}: {
  serviceDescription?: {links?: {termsOfService?: string; privacyPolicy?: string}}
  needsGuardian: boolean
  under13: boolean
}) => {
  const t = useTheme()
  const {_} = useLingui()

  const tos = serviceDescription?.links?.termsOfService || 'https://sonet.example.com/terms'
  const pp = serviceDescription?.links?.privacyPolicy || 'https://sonet.example.com/privacy'

  let els: ReactElement | null = null
  if (tos && pp) {
    els = (
      <Trans>
        By creating an account you agree to the{' '}
        <InlineLinkText label={_(msg`Read Terms of Service`)} key="tos" to={tos}>
          Terms of Service
        </InlineLinkText>{' '}
        and{' '}
        <InlineLinkText label={_(msg`Read Privacy Policy`)} key="pp" to={pp}>
          Privacy Policy
        </InlineLinkText>
        .
      </Trans>
    )
  }

  return (
    <View style={[a.gap_sm]}>
      {els ? (
        <Text style={[a.leading_snug, t.atoms.text_contrast_medium]}>{els}</Text>
      ) : null}

      {under13 ? (
        <Admonition type="error">
          <Trans>You must be 13 years of age or older to create an account.</Trans>
        </Admonition>
      ) : needsGuardian ? (
        <Admonition type="warning">
          <Trans>
            If you are not yet an adult according to the laws of your country, your parent or legal guardian
            must read these Terms on your behalf.
          </Trans>
        </Admonition>
      ) : undefined}
    </View>
  )
}

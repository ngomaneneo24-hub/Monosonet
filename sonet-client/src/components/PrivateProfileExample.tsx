import React from 'react'
import {View} from 'react-native'
import {Trans} from '@lingui/macro'

import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/components/Typography'
import {PrivateProfileFollowButton} from './PrivateProfileFollowButton'
import {PrivateProfileFollowDialog} from './PrivateProfileFollowDialog'
import * as bsky from '#/types/bsky'

// Example usage of private profile components
export function PrivateProfileExample() {
  const t = useTheme()

  // Example profile data
  const exampleProfile: bsky.profile.AnyProfileView = {
    did: 'did:plc:example123',
    handle: 'example.user',
    displayName: 'Example User',
    description: 'This is an example private profile',
    avatar: null,
    banner: null,
    followsCount: 10,
    followersCount: 20,
    postsCount: 50,
    indexedAt: '2024-01-01T00:00:00Z',
    viewer: {
      following: false,
      followedBy: null,
      muted: false,
      blockedBy: false,
      blocking: false,
    },
    labels: [],
    isPrivate: true, // This makes it a private profile
  }

  return (
    <View style={[a.p_lg, a.gap_lg]}>
      <Text style={[a.text_lg, a.font_heavy, t.atoms.text_contrast_high]}>
        <Trans>Private Profile Components Example</Trans>
      </Text>

      <View style={[a.gap_md]}>
        <Text style={[a.text_md, t.atoms.text_contrast_high]}>
          <Trans>Private Profile Follow Button:</Trans>
        </Text>
        <PrivateProfileFollowButton
          profile={exampleProfile}
          logContext="PrivateProfileExample"
          colorInverted={false}
          onFollow={() => console.log('Followed private profile')}
        />
      </View>

      <View style={[a.gap_md]}>
        <Text style={[a.text_md, t.atoms.text_contrast_high]}>
          <Trans>Private Profile Follow Dialog:</Trans>
        </Text>
        <PrivateProfileFollowDialog
          profile={exampleProfile}
          onFollow={() => console.log('Followed via dialog')}
        />
      </View>

      <View style={[a.gap_md]}>
        <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
          <Trans>
            The PrivateProfileFollowButton automatically detects private profiles
            and shows the appropriate dialog. The PrivateProfileFollowDialog
            provides a user-friendly way to follow private accounts.
          </Trans>
        </Text>
      </View>
    </View>
  )
}
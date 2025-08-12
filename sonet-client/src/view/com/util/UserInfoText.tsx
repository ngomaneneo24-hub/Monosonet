import {StyleProp, StyleSheet, TextStyle} from 'react-native'
import {SonetActorGetProfile as GetProfile} from '@sonet/api'

import {makeProfileLink} from '#/lib/routes/links'
import {sanitizeDisplayName} from '#/lib/strings/display-names'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {TypographyVariant} from '#/lib/ThemeContext'
import {STALE} from '#/state/queries'
import {useProfileQuery} from '#/state/queries/profile'
import {TextLinkOnWebOnly} from './Link'
import {LoadingPlaceholder} from './LoadingPlaceholder'
import {Text} from './text/Text'

export function UserInfoText({
  type = 'md',
  userId,
  attr,
  failed,
  prefix,
  style,
}: {
  type?: TypographyVariant
  userId: string
  attr?: keyof GetProfile.OutputSchema
  loading?: string
  failed?: string
  prefix?: string
  style?: StyleProp<TextStyle>
}) {
  attr = attr || 'username'
  failed = failed || 'user'

  const {data: profile, isError} = useProfileQuery({
    userId,
    staleTime: STALE.INFINITY,
  })

  let inner
  if (isError) {
    inner = (
      <Text type={type} style={style} numberOfLines={1}>
        {failed}
      </Text>
    )
  } else if (profile) {
    inner = (
      <TextLinkOnWebOnly
        type={type}
        style={style}
        lineHeight={1.2}
        numberOfLines={1}
        href={makeProfileLink(profile)}
        text={
          <Text emoji type={type} style={style} lineHeight={1.2}>
            {`${prefix || ''}${sanitizeDisplayName(
              typeof profile[attr] === 'string' && profile[attr]
                ? (profile[attr] as string)
                : sanitizeUsername(profile.username),
            )}`}
          </Text>
        }
      />
    )
  } else {
    inner = (
      <LoadingPlaceholder
        width={80}
        height={8}
        style={styles.loadingPlaceholder}
      />
    )
  }

  return inner
}

const styles = StyleSheet.create({
  loadingPlaceholder: {position: 'relative', top: 1, left: 2},
})

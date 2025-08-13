import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {type NativeStackScreenProps} from '@react-navigation/native-stack'

import {type AllNavigatorParams} from '#/lib/routes/types'
import {NoteFeed} from '#/view/com/notes/NoteFeed'
import {EmptyState} from '#/view/com/util/EmptyState'
import * as Layout from '#/components/Layout'
import {ListFooter} from '#/components/Lists'

type Props = NativeStackScreenProps<
  AllNavigatorParams,
  'NotificationsActivityList'
>
export function NotificationsActivityListScreen({
  route: {
    params: {notes},
  },
}: Props) {
  const uris = decodeURIComponent(notes)
  const {_} = useLingui()

  return (
    <Layout.Screen testID="NotificationsActivityListScreen">
      <Layout.Header.Outer>
        <Layout.Header.BackButton />
        <Layout.Header.Content>
          <Layout.Header.TitleText>
            <Trans>Notifications</Trans>
          </Layout.Header.TitleText>
        </Layout.Header.Content>
        <Layout.Header.Slot />
      </Layout.Header.Outer>
      <NoteFeed
        feed={`notes|${uris}`}
        disablePoll
        renderEmptyState={() => (
          <EmptyState icon="growth" message={_(msg`No notes here`)} />
        )}
        renderEndOfFeed={() => <ListFooter />}
      />
    </Layout.Screen>
  )
}

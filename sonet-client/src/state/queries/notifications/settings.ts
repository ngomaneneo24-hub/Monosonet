import {type SonetNotificationDefs} from '@sonet/api'
import {t} from '@lingui/macro'
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {logger} from '#/logger'
import {useAgent} from '#/state/session'
import * as Toast from '#/view/com/util/Toast'

const RQKEY_ROOT = 'notification-settings'
const RQKEY = [RQKEY_ROOT]

export function useNotificationSettingsQuery({
  enabled,
}: {enabled?: boolean} = {}) {
  const agent = useAgent()

  return useQuery({
    queryKey: RQKEY,
    queryFn: async () => {
      const response = await agent.app.sonet.notification.getPreferences()
      return response.data.preferences
    },
    enabled,
  })
}
export function useNotificationSettingsUpdateMutation() {
  const agent = useAgent()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      update: Partial<SonetNotificationDefs.Preferences>,
    ) => {
      const response =
        await agent.app.sonet.notification.putPreferencesV2(update)
      return response.data.preferences
    },
    onMutate: update => {
      optimisticUpdateNotificationSettings(queryClient, update)
    },
    onError: e => {
      logger.error('Could not update notification settings', {message: e})
      queryClient.invalidateQueries({queryKey: RQKEY})
      Toast.show(t`Could not update notification settings`, 'xmark')
    },
  })
}

function optimisticUpdateNotificationSettings(
  queryClient: QueryClient,
  update: Partial<SonetNotificationDefs.Preferences>,
) {
  queryClient.setQueryData(
    RQKEY,
    (old?: SonetNotificationDefs.Preferences) => {
      if (!old) return old
      return {...old, ...update}
    },
  )
}

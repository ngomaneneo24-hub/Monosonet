import {useMutation} from '@tanstack/react-query'
import {sonetClient} from '@sonet/api'
import {useRequestEmailUpdate} from '#/components/dialogs/EmailDialog/data/useRequestEmailUpdate'

async function updateEmailAndRefreshSession(
  email: string,
  token?: string,
) {
  await sonetClient.updateEmail({email: email.trim(), token})
  // Sonet usernames session refresh automatically
}

export function useUpdateEmail() {
  const {mutateAsync: requestEmailUpdate} = useRequestEmailUpdate()

  return useMutation<
    {status: 'tokenRequired' | 'success'},
    Error,
    {email: string; token?: string}
  >({
    mutationFn: async ({email, token}: {email: string; token?: string}) => {
      if (token) {
        await updateEmailAndRefreshSession(email, token)
        return {
          status: 'success',
        }
      } else {
        const {tokenRequired} = await requestEmailUpdate()
        if (tokenRequired) {
          return {
            status: 'tokenRequired',
          }
        } else {
          await updateEmailAndRefreshSession(email, token)
          return {
            status: 'success',
          }
        }
      }
    },
  })
}

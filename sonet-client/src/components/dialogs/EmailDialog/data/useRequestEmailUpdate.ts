import {useMutation} from '@tanstack/react-query'
import {sonetClient} from '@sonet/api'

export function useRequestEmailUpdate() {
  return useMutation({
    mutationFn: async () => {
      // Sonet simplified email update request
      return await sonetClient.requestEmailUpdate()
    },
  })
}

import {SonetActorDefs} from '@sonet/api'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {preferencesQueryKey} from '#/state/queries/preferences'
import {useAgent} from '#/state/session'

export function useNoteInteractionSettingsMutation() {
  const qc = useQueryClient()
  const agent = useAgent()
  return useMutation({
    async mutationFn(props: SonetActorDefs.NoteInteractionSettingsPref) {
      await agent.setNoteInteractionSettings(props)
    },
    async onSuccess() {
      await qc.invalidateQueries({
        queryKey: preferencesQueryKey,
      })
    },
  })
}

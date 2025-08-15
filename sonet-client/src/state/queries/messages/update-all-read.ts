import {useMutation} from '@tanstack/react-query'

export function useUpdateAllRead(status: 'accepted' | 'request', opts?: {onMutate?: () => void; onError?: (e: unknown) => void}) {
	return useMutation({
		mutationFn: async () => {
			// TODO: Integrate when Sonet messaging API exposes a bulk mark-read endpoint
			return {success: true}
		},
		onMutate: opts?.onMutate,
		onError: opts?.onError,
	})
}
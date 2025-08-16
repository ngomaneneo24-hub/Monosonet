import React from 'react'
import {useMutation} from '@tanstack/react-query'

const LeftConvosContext = React.createContext<string[]>([])

export function LeftConvosProvider({children}: {children: React.ReactNode}) {
	const [ids] = React.useState<string[]>([])
	return <LeftConvosContext.Provider value={ids}>{children}</LeftConvosContext.Provider>
}

export function useLeftConvos() {
	return React.useContext(LeftConvosContext)
}

export function useLeaveConvo(convoId: string, opts?: {onMutate?: () => void; onError?: (e: unknown) => void}) {
	return useMutation({
		mutationFn: async () => {
			// TODO: implement with Sonet messaging API when endpoint is available
			return {success: true}
		},
		onMutate: opts?.onMutate,
		onError: opts?.onError,
	})
}
import React from 'react'

interface NoteProgressState {
  progress: number
  status: 'pending' | 'success' | 'error' | 'idle'
  error?: string
}

const NoteProgressContext = React.createContext<NoteProgressState>({
  progress: 0,
  status: 'idle',
})

export function Provider() {}

export function useNoteProgress() {
  return React.useContext(NoteProgressContext)
}

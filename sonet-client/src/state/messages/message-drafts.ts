import {useCallback, useRef} from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const DRAFT_PREFIX = 'sonet_message_draft_'

export function useMessageDraft(conversationId?: string) {
  const draftRef = useRef<string>('')

  const getDraft = useCallback(() => {
    return draftRef.current
  }, [])

  const setDraft = useCallback((draft: string) => {
    draftRef.current = draft
  }, [])

  const saveDraft = useCallback(async (draft: string) => {
    if (!conversationId) return
    
    try {
      const key = `${DRAFT_PREFIX}${conversationId}`
      if (draft.trim()) {
        await AsyncStorage.setItem(key, draft)
      } else {
        await AsyncStorage.removeItem(key)
      }
      draftRef.current = draft
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  }, [conversationId])

  const loadDraft = useCallback(async () => {
    if (!conversationId) return ''
    
    try {
      const key = `${DRAFT_PREFIX}${conversationId}`
      const draft = await AsyncStorage.getItem(key)
      if (draft) {
        draftRef.current = draft
        return draft
      }
    } catch (error) {
      console.error('Failed to load draft:', error)
    }
    return ''
  }, [conversationId])

  const clearDraft = useCallback(async () => {
    if (!conversationId) return
    
    try {
      const key = `${DRAFT_PREFIX}${conversationId}`
      await AsyncStorage.removeItem(key)
      draftRef.current = ''
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  }, [conversationId])

  return {
    getDraft,
    setDraft,
    saveDraft,
    loadDraft,
    clearDraft,
  }
}

export function useSaveMessageDraft(conversationId?: string) {
  const {saveDraft} = useMessageDraft(conversationId)
  
  return useCallback((draft: string) => {
    saveDraft(draft)
  }, [saveDraft])
}

export function useLoadMessageDraft(conversationId?: string) {
  const {loadDraft} = useMessageDraft(conversationId)
  
  return useCallback(() => {
    return loadDraft()
  }, [loadDraft])
}

export function useClearMessageDraft(conversationId?: string) {
  const {clearDraft} = useMessageDraft(conversationId)
  
  return useCallback(() => {
    clearDraft()
  }, [clearDraft])
}
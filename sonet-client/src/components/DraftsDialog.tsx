import React, {useCallback, useState} from 'react'
import {ScrollView, View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useUserDraftsQuery, useDeleteDraftMutation, type Draft} from '#/state/queries/drafts'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'
import {TimesLarge_Stroke2_Corner0_Rounded as X} from '#/components/icons/Times'
import {Text} from '#/components/Typography'
import * as Toast from '#/view/com/util/Toast'

interface DraftsDialogProps {
  onSelectDraft: (draft: Draft) => void
  onClose: () => void
}

export function DraftsDialog({onSelectDraft, onClose}: DraftsDialogProps) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const control = Dialog.useDialogControl()
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)
  
  const {data: draftsData, isLoading} = useUserDraftsQuery(50, undefined, false)
  const deleteDraft = useDeleteDraftMutation()

  const usernameDraftSelect = useCallback((draft: Draft) => {
    setSelectedDraft(draft)
    control.open()
  }, [control])

  const usernameConfirmSelect = useCallback(() => {
    if (selectedDraft) {
      onSelectDraft(selectedDraft)
      control.close()
      onClose()
    }
  }, [selectedDraft, onSelectDraft, control, onClose])

  const usernameDeleteDraft = useCallback(async (draftId: string) => {
    try {
      await deleteDraft.mutateAsync(draftId)
      Toast.show(_(msg`Draft deleted`), 'check')
    } catch (error) {
      Toast.show(_(msg`Failed to delete draft`), 'xmark')
    }
  }, [deleteDraft, _])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
  }

  const truncateContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + '...'
  }

  if (isLoading) {
    return (
      <Dialog.Outer control={control}>
        <Dialog.Username />
        <Dialog.Inner>
          <View style={[a.p_lg, a.align_center]}>
            <Text style={[a.text_lg, t.atoms.text_contrast_high]}>
              <Trans>Loading drafts...</Trans>
            </Text>
          </View>
        </Dialog.Inner>
      </Dialog.Outer>
    )
  }

  const drafts = draftsData?.drafts || []

  return (
    <>
      <Dialog.Outer control={control}>
        <Dialog.Username />
        <Dialog.Inner>
          <View style={[a.p_lg, a.gap_lg]}>
            <View style={[a.flex_row, a.align_center, a.justify_between]}>
              <Text style={[a.text_lg, a.font_heavy, t.atoms.text_contrast_high]}>
                <Trans>Select Draft</Trans>
              </Text>
              <Button
                label={_(msg`Close`)}
                variant="ghost"
                color="secondary"
                size="small"
                onPress={() => control.close()}>
                <ButtonIcon icon={X} />
              </Button>
            </View>
            
            <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
              <Trans>Choose a draft to continue editing</Trans>
            </Text>

            <ScrollView style={[a.max_h_96]}>
              {drafts.length === 0 ? (
                <View style={[a.p_lg, a.align_center]}>
                  <Text style={[a.text_md, t.atoms.text_contrast_medium]}>
                    <Trans>No drafts found</Trans>
                  </Text>
                </View>
              ) : (
                <View style={[a.gap_md]}>
                  {drafts.map((draft) => (
                    <DraftItem
                      key={draft.draft_id}
                      draft={draft}
                      onSelect={usernameDraftSelect}
                      onDelete={usernameDeleteDraft}
                      formatDate={formatDate}
                      truncateContent={truncateContent}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </Dialog.Inner>
      </Dialog.Outer>

      {/* Confirmation Dialog */}
      <Dialog.Outer control={control}>
        <Dialog.Username />
        <Dialog.Inner>
          <View style={[a.p_lg, a.gap_lg]}>
            <Text style={[a.text_lg, a.font_heavy, t.atoms.text_contrast_high]}>
              <Trans>Load Draft?</Trans>
            </Text>
            
            <Text style={[a.text_md, t.atoms.text_contrast_high]}>
              <Trans>
                This will replace your current note content. Are you sure you want to load this draft?
              </Trans>
            </Text>

            <View style={[a.flex_row, a.gap_md, a.justify_end]}>
              <Button
                label={_(msg`Cancel`)}
                variant="ghost"
                color="secondary"
                onPress={() => control.close()}>
                <ButtonText>
                  <Trans>Cancel</Trans>
                </ButtonText>
              </Button>
              <Button
                label={_(msg`Load Draft`)}
                variant="solid"
                color="primary"
                onPress={usernameConfirmSelect}>
                <ButtonText>
                  <Trans>Load Draft</Trans>
                </ButtonText>
              </Button>
            </View>
          </View>
        </Dialog.Inner>
      </Dialog.Outer>
    </>
  )
}

interface DraftItemProps {
  draft: Draft
  onSelect: (draft: Draft) => void
  onDelete: (draftId: string) => void
  formatDate: (dateString: string) => string
  truncateContent: (content: string, maxLength?: number) => string
}

function DraftItem({draft, onSelect, onDelete, formatDate, truncateContent}: DraftItemProps) {
  const {_} = useLingui()
  const t = useTheme()

  const usernameSelect = useCallback(() => {
    onSelect(draft)
  }, [draft, onSelect])

  const usernameDelete = useCallback((e: any) => {
    e.stopPropagation()
    onDelete(draft.draft_id)
  }, [draft.draft_id, onDelete])

  return (
    <Button
      label={_(msg`Select draft from ${formatDate(draft.updated_at)}`)}
      variant="ghost"
      color="secondary"
      style={[
        a.p_md,
        a.rounded_lg,
        a.border,
        t.atoms.border_contrast_low,
        t.atoms.bg_contrast_25,
      ]}
      onPress={usernameSelect}>
      <View style={[a.flex_1, a.gap_sm]}>
        <View style={[a.flex_row, a.align_center, a.justify_between]}>
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {formatDate(draft.updated_at)}
          </Text>
          <Button
            label={_(msg`Delete draft`)}
            variant="ghost"
            color="negative"
            size="small"
            onPress={usernameDelete}>
            <ButtonIcon icon={TrashIcon} />
          </Button>
        </View>
        
        <Text style={[a.text_md, t.atoms.text_contrast_high]}>
          {truncateContent(draft.content)}
        </Text>
        
        {(draft.images.length > 0 || draft.video) && (
          <Text style={[a.text_sm, t.atoms.text_contrast_medium]}>
            {draft.images.length > 0 && (
              <Trans>{draft.images.length} image{draft.images.length !== 1 ? 's' : ''}</Trans>
            )}
            {draft.images.length > 0 && draft.video && ' • '}
            {draft.video && <Trans>Video</Trans>}
          </Text>
        )}
      </View>
    </Button>
  )
}
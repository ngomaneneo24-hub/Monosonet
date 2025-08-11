import React, {useCallback} from 'react'
import {View} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useCreateDraftMutation} from '#/state/queries/drafts'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import {Text} from '#/components/Typography'
import * as Toast from '#/view/com/util/Toast'

interface SaveDraftDialogProps {
  control: Dialog.DialogControl
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
  content?: any
}

export function SaveDraftDialog({
  control,
  onSave,
  onDiscard,
  onCancel,
  content,
}: SaveDraftDialogProps) {
  const {_} = useLingui()
  const t = useTheme()
  const createDraft = useCreateDraftMutation()

  const handleSave = useCallback(async () => {
    if (!content) {
      Toast.show(_(msg`No content to save`), 'xmark')
      return
    }
    
    try {
      await createDraft.mutateAsync({
        ...content,
        is_auto_saved: false,
      })
      Toast.show(_(msg`Draft saved`), 'check')
      onSave()
    } catch (error) {
      Toast.show(_(msg`Failed to save draft`), 'xmark')
    }
  }, [createDraft, onSave, _, content])

  const handleDiscard = useCallback(() => {
    onDiscard()
  }, [onDiscard])

  const handleCancel = useCallback(() => {
    onCancel()
  }, [onCancel])

  return (
    <Dialog.Outer control={control}>
      <Dialog.Handle />
      <Dialog.Inner>
        <View style={[a.p_lg, a.gap_lg]}>
          <View style={[a.align_center, a.gap_md]}>
            <Text style={[a.text_lg, a.font_heavy, t.atoms.text_contrast_high]}>
              <Trans>Discard draft?</Trans>
            </Text>
            <Text style={[a.text_md, t.atoms.text_contrast_high, a.text_center]}>
              <Trans>Are you sure you want to discard this draft?</Trans>
            </Text>
          </View>

          <View style={[a.flex_row, a.gap_md, a.justify_end]}>
            <Button
              label={_(msg`Cancel`)}
              variant="ghost"
              color="secondary"
              onPress={handleCancel}>
              <ButtonText>
                <Trans>Cancel</Trans>
              </ButtonText>
            </Button>
            <Button
              label={_(msg`Save`)}
              variant="solid"
              color="primary"
              onPress={handleSave}
              disabled={createDraft.isPending}>
              <ButtonText>
                <Trans>Save</Trans>
              </ButtonText>
            </Button>
            <Button
              label={_(msg`Discard`)}
              variant="solid"
              color="negative"
              onPress={handleDiscard}>
              <ButtonText>
                <Trans>Discard</Trans>
              </ButtonText>
            </Button>
          </View>
        </View>
      </Dialog.Inner>
    </Dialog.Outer>
  )
}
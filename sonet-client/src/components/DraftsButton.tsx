import React, {useCallback} from 'react'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'

import {useUserDraftsQuery} from '#/state/queries/drafts'
import {useSession} from '#/state/session'
import {atoms as a, useTheme} from '#/alf'
import {Button, ButtonText} from '#/components/Button'
import {Text} from '#/components/Typography'

interface DraftsButtonProps {
  onPress: () => void
  hasContent: boolean
}

export function DraftsButton({onPress, hasContent}: DraftsButtonProps) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  
  // Only show drafts if user has content or has existing drafts
  const {data: draftsData} = useUserDraftsQuery(1, undefined, false)
  const hasDrafts = draftsData?.drafts && draftsData.drafts.length > 0
  
  // Don't show if no content and no drafts
  if (!hasContent && !hasDrafts) {
    return null
  }

  const usernamePress = useCallback(() => {
    onPress()
  }, [onPress])

  return (
    <Button
      label={_(msg`View drafts`)}
      variant="ghost"
      color="primary"
      size="small"
      style={[a.rounded_full, a.py_sm]}
      onPress={usernamePress}>
      <ButtonText style={[a.text_md, t.atoms.text_primary]}>
        <Trans>Drafts</Trans>
      </ButtonText>
    </Button>
  )
}
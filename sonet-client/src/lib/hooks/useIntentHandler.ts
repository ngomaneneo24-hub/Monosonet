import React from 'react'
import {isNative} from '#/platform/detection'
import {useOpenComposer} from '#/lib/hooks/useOpenComposer'
import {useSession} from '#/state/session'
import {useCloseAllActiveElements} from '#/state/util'
import {useIntentDialogs} from '#/components/intents/IntentDialogs'

const VALID_IMAGE_REGEX = /^[\w.:\-_/]+\|\d+(\.\d+)?\|\d+(\.\d+)?$/



export function useComposeIntent() {
  const closeAllActiveElements = useCloseAllActiveElements()
  const {openComposer} = useOpenComposer()
  const {hasSession} = useSession()

  return React.useCallback(
    ({
      text,
      imageUrisStr,
      videoUri,
    }: {
      text: string | null
      imageUrisStr: string | null
      videoUri: string | null
    }) => {
      if (!hasSession) return
      closeAllActiveElements()

      // Whenever a video URI is present, we don't support adding images right now.
      if (videoUri) {
        const [uri, width, height] = videoUri.split('|')
        openComposer({
          text: text ?? undefined,
          videoUri: {uri, width: Number(width), height: Number(height)},
        })
        return
      }

      const imageUris = imageUrisStr
        ?.split(',')
        .filter(part => {
          // For some security, we're going to filter out any image uri that is external. We don't want someone to
          // be able to provide some link like "sonet://intent/compose?imageUris=https://IHaveYourIpNow.com/image.jpeg
          // and we load that image
          if (part.includes('https://') || part.includes('http://')) {
            return false
          }
          // We also should just filter out cases that don't have all the info we need
          return VALID_IMAGE_REGEX.test(part)
        })
        .map(part => {
          const [uri, width, height] = part.split('|')
          return {uri, width: Number(width), height: Number(height)}
        })

      setTimeout(() => {
        openComposer({
          text: text ?? undefined,
          imageUris: isNative ? imageUris : undefined,
        })
      }, 500)
    },
    [hasSession, closeAllActiveElements, openComposer],
  )
}

function useVerifyEmailIntent() {
  const closeAllActiveElements = useCloseAllActiveElements()
  const {verifyEmailDialogControl: control, setVerifyEmailState: setState} =
    useIntentDialogs()
  return React.useCallback(
    (code: string) => {
      closeAllActiveElements()
      setState({
        code,
      })
      setTimeout(() => {
        control.open()
      }, 1000)
    },
    [closeAllActiveElements, control, setState],
  )
}

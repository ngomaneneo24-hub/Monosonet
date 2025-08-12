import {I18n} from '@lingui/core'
import {msg} from '@lingui/macro'

import {UploadLimitError} from '#/lib/media/video/errors'
import {sonetClient} from '@sonet/api'

export async function getServiceAuthToken({
  agent,
  aud,
  lxm,
  exp,
}: {
  agent: any // Sonet agent type
  aud?: string
  lxm: string
  exp?: number
}) {
  // Sonet uses JWT tokens directly, no need for service auth
  return agent?.session?.accessToken || sonetClient.getAccessToken()
}

export async function getVideoUploadLimits(agent: any, _: I18n['_']) {
  // Sonet video upload limits - simplified for now
  // In a real implementation, this would call Sonet's video service API
  try {
    // For now, assume uploads are always allowed
    const limits = {
      canUpload: true,
      message: undefined,
    }
    
    if (!limits.canUpload) {
      if (limits.message) {
        throw new UploadLimitError(limits.message)
      } else {
        throw new UploadLimitError(
          _(
            msg`You have temporarily reached the limit for video uploads. Please try again later.`,
          ),
        )
      }
    }
  } catch (error) {
    if (error instanceof UploadLimitError) {
      throw error
    }
    throw new UploadLimitError(
      _(
        msg`Unable to check video upload limits. Please try again later.`,
      ),
    )
  }
}

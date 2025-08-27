import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useMutation} from '@tanstack/react-query'

import {logger} from '#/logger'
import {useAgent} from '#/state/session'
import {ReportState} from './state'
import {ParsedReportSubject} from './types'
import {sonetClient} from '@sonet/api'

export function useSubmitReportMutation() {
  const {_} = useLingui()
  const agent = useAgent()

  return useMutation({
    async mutationFn({
      subject,
      state,
    }: {
      subject: ParsedReportSubject
      state: ReportState
    }) {
      if (!state.selectedOption) {
        throw new Error(_(msg`Please select a reason for this report`))
      }
      if (!state.selectedLabeler) {
        throw new Error(_(msg`Please select a moderation service`))
      }

      // Sonet simplified report structure
      let report: any

      switch (subject.type) {
        case 'account': {
          report = {
            reasonType: state.selectedOption.reason,
            reason: state.details,
            subject: {
              type: 'user',
              userId: subject.userId,
            },
          }
          break
        }
        case 'note':
        case 'list':
        case 'feed':
        case 'starterPack': {
          report = {
            reasonType: state.selectedOption.reason,
            reason: state.details,
            subject: {
              type: 'content',
              uri: subject.uri,
              id: subject.cid,
              userId: (subject as any).authorUserId,
            },
          }
          break
        }
        case 'chatMessage': {
          report = {
            reasonType: state.selectedOption.reason,
            reason: state.details,
            subject: {
              type: 'message',
              messageId: subject.message.id,
              conversationId: subject.convoId,
              userId: subject.message.sender.userId,
            },
          }
          break
        }
      }

      // Submit via agent (which proxies to SonetClient -> Gateway)
      await agent.createModerationReport(report)
    },
  })
}

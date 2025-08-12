import {useMemo} from 'react'
import {msg} from '@lingui/macro'
import {useLingui} from '@lingui/react'

export interface ReportOption {
  reason: string
  title: string
  description: string
}

interface ReportOptions {
  account: ReportOption[]
  note: ReportOption[]
  list: ReportOption[]
  starterPack: ReportOption[]
  feed: ReportOption[]
  chatMessage: ReportOption[]
}

export function useReportOptions(): ReportOptions {
  const {_} = useLingui()

  return useMemo(() => {
    const other = {
      reason: 'other',
      title: _(msg`Other`),
      description: _(msg`An issue not included in these options`),
    }
    const common = [
      {
        reason: 'rude',
        title: _(msg`Anti-Social Behavior`),
        description: _(msg`Harassment, trolling, or intolerance`),
      },
      {
        reason: 'violation',
        title: _(msg`Illegal and Urgent`),
        description: _(msg`Glaring violations of law or terms of service`),
      },
      other,
    ]
    return {
      account: [
        {
          reason: 'misleading',
          title: _(msg`Misleading Account`),
          description: _(
            msg`Impersonation or false claims about identity or affiliation`,
          ),
        },
        {
          reason: 'spam',
          title: _(msg`Frequently Notes Unwanted Content`),
          description: _(msg`Spam; excessive mentions or replies`),
        },
        {
          reason: 'violation',
          title: _(msg`Name or Description Violates Community Standards`),
          description: _(msg`Terms used violate community standards`),
        },
        other,
      ],
      note: [
        {
          reason: 'misleading',
          title: _(msg`Misleading Note`),
          description: _(msg`Impersonation, misinformation, or false claims`),
        },
        {
          reason: 'spam',
          title: _(msg`Spam`),
          description: _(msg`Excessive mentions or replies`),
        },
        {
          reason: 'sexual',
          title: _(msg`Unwanted Sexual Content`),
          description: _(msg`Nudity or adult content not labeled as such`),
        },
        ...common,
      ],
      chatMessage: [
        {
          reason: 'spam',
          title: _(msg`Spam`),
          description: _(msg`Excessive or unwanted messages`),
        },
        {
          reason: 'sexual',
          title: _(msg`Unwanted Sexual Content`),
          description: _(msg`Inappropriate messages or explicit links`),
        },
        ...common,
      ],
      list: [
        {
          reason: SonetModerationDefs.REASONVIOLATION,
          title: _(msg`Name or Description Violates Community Standards`),
          description: _(msg`Terms used violate community standards`),
        },
        ...common,
      ],
      starterPack: [
        {
          reason: SonetModerationDefs.REASONVIOLATION,
          title: _(msg`Name or Description Violates Community Standards`),
          description: _(msg`Terms used violate community standards`),
        },
        ...common,
      ],
      feed: [
        {
          reason: SonetModerationDefs.REASONVIOLATION,
          title: _(msg`Name or Description Violates Community Standards`),
          description: _(msg`Terms used violate community standards`),
        },
        ...common,
      ],
    }
  }, [_])
}

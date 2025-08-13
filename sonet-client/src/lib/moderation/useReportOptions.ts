import {useMemo} from 'react'
import {SonetModerationDefs} from '@sonet/api'
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
  starterpack: ReportOption[]
  feedgen: ReportOption[]
  other: ReportOption[]
  convoMessage: ReportOption[]
}

export function useReportOptions(): ReportOptions {
  const {_} = useLingui()
  return useMemo(() => {
    const other = {
      reason: SonetModerationDefs.REASONOTHER,
      title: _(msg`Other`),
      description: _(msg`An issue not included in these options`),
    }
    const common = [
      {
        reason: SonetModerationDefs.REASONRUDE,
        title: _(msg`Anti-Social Behavior`),
        description: _(msg`Harassment, trolling, or intolerance`),
      },
      {
        reason: SonetModerationDefs.REASONVIOLATION,
        title: _(msg`Illegal and Urgent`),
        description: _(msg`Glaring violations of law or terms of service`),
      },
      other,
    ]
    return {
      account: [
        {
          reason: SonetModerationDefs.REASONMISLEADING,
          title: _(msg`Misleading Account`),
          description: _(
            msg`Impersonation or false claims about identity or affiliation`,
          ),
        },
        {
          reason: SonetModerationDefs.REASONSPAM,
          title: _(msg`Frequently Notes Unwanted Content`),
          description: _(msg`Spam; excessive mentions or replies`),
        },
        {
          reason: SonetModerationDefs.REASONVIOLATION,
          title: _(msg`Name or Description Violates Community Standards`),
          description: _(msg`Terms used violate community standards`),
        },
        other,
      ],
      note: [
        {
          reason: SonetModerationDefs.REASONMISLEADING,
          title: _(msg`Misleading Note`),
          description: _(msg`Impersonation, misinformation, or false claims`),
        },
        {
          reason: SonetModerationDefs.REASONSPAM,
          title: _(msg`Spam`),
          description: _(msg`Excessive mentions or replies`),
        },
        {
          reason: SonetModerationDefs.REASONSEXUAL,
          title: _(msg`Unwanted Sexual Content`),
          description: _(msg`Nudity or adult content not labeled as such`),
        },
        ...common,
      ],
      convoMessage: [
        {
          reason: SonetModerationDefs.REASONSPAM,
          title: _(msg`Spam`),
          description: _(msg`Excessive or unwanted messages`),
        },
        {
          reason: SonetModerationDefs.REASONSEXUAL,
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
      starterpack: [
        {
          reason: SonetModerationDefs.REASONVIOLATION,
          title: _(msg`Name or Description Violates Community Standards`),
          description: _(msg`Terms used violate community standards`),
        },
        ...common,
      ],
      feedgen: [
        {
          reason: SonetModerationDefs.REASONVIOLATION,
          title: _(msg`Name or Description Violates Community Standards`),
          description: _(msg`Terms used violate community standards`),
        },
        ...common,
      ],
      other: common,
    }
  }, [_])
}

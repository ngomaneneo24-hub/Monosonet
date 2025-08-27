import * as Dialog from '#/components/Dialog'
import {SonetUser, SonetNote, SonetConversation, SonetMessage} from '@sonet/types'

export type ReportSubject =
  | SonetUser
  | SonetNote
  | SonetConversation
  | {conversationId: string; message: SonetMessage}

export type ParsedReportSubject =
  | {
      type: 'note'
      uri: string
      id: string
      authorUserId?: string
      attributes: {
        reply: boolean
        image: boolean
        video: boolean
        link: boolean
        quote: boolean
      }
    }
  | {
      type: 'list'
      uri: string
      id: string
    }
  | {
      type: 'feed'
      uri: string
      id: string
    }
  | {
      type: 'starterPack'
      uri: string
      id: string
    }
  | {
      type: 'account'
      userId: string
    }
  | {
      type: 'chatMessage'
      conversationId: string
      message: SonetMessage
    }

export type ReportDialogProps = {
  control: Dialog.DialogOuterProps['control']
  subject: ParsedReportSubject
}

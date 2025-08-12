import * as Dialog from '#/components/Dialog'

export type ReportDialogProps = {
  control: Dialog.DialogOuterProps['control']
  params:
    | {
        type: 'note' | 'list' | 'feedgen' | 'starterpack' | 'other'
        uri: string
        cid: string
      }
    | {
        type: 'account'
        userId: string
      }
    | {type: 'convoMessage'}
}

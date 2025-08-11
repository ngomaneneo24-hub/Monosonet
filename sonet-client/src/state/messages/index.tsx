import React from 'react'

import {CurrentConvoIdProvider} from '#/state/messages/current-convo-id'
import {MessagesEventBusProvider} from '#/state/messages/events'
import {SonetListConvosProvider} from '#/state/queries/messages/sonet'
import {MessageDraftsProvider} from './message-drafts'

export function MessagesProvider({children}: {children: React.ReactNode}) {
  return (
    <CurrentConvoIdProvider>
      <MessageDraftsProvider>
        <MessagesEventBusProvider>
          <SonetListConvosProvider>
            {children}
          </SonetListConvosProvider>
        </MessagesEventBusProvider>
      </MessageDraftsProvider>
    </CurrentConvoIdProvider>
  )
}

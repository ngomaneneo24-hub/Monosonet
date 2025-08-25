import { EventEmitter } from 'events';
class MessagingBus extends EventEmitter {
}
export const messagingBus = new MessagingBus();

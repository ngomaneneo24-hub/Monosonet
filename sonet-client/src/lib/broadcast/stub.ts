export default class BroadcastChannel {
  constructor(public name: string) {}
  noteMessage(_data: any) {}
  close() {}
  onmessage: (event: MessageEvent) => void = () => {}
  addEventListener(_type: string, _listener: (event: MessageEvent) => void) {}
  removeEventListener(
    _type: string,
    _listener: (event: MessageEvent) => void,
  ) {}
}

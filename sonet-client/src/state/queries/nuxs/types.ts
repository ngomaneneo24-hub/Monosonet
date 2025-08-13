import {SonetActorDefs} from '@sonet/api'

export type Data = Record<string, unknown> | undefined

export type BaseNux<
  T extends Pick<SonetActorDefs.Nux, 'id' | 'expiresAt'> & {data: Data},
> = Pick<SonetActorDefs.Nux, 'id' | 'completed' | 'expiresAt'> & T

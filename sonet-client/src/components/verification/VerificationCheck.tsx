import {type Props} from '#/components/icons/common'
import {VerifiedCheck} from '#/components/icons/VerifiedCheck'
import {FounderCheck} from '#/components/icons/FounderCheck'

export function VerificationCheck({
  founder,
  ...rest
}: Props & {
  founder?: boolean
}) {
  return founder ? <FounderCheck {...rest} /> : <VerifiedCheck {...rest} />
}

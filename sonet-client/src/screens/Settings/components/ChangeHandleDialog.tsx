import {useCallback, useMemo, useState} from 'react'
import {useWindowDimensions, View} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  LayoutAnimationConfig,
  LinearTransition,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from 'react-native-reanimated'
import {type SonetServerDescribeServer} from '@sonet/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {useMutation, useQueryClient} from '@tanstack/react-query'

import {HITSLOP_10, urls} from '#/lib/constants'
import {cleanError} from '#/lib/strings/errors'
import {createFullUsername, validateServiceUsername} from '#/lib/strings/usernames'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {useFetchDid, useUpdateUsernameMutation} from '#/state/queries/username'
import {RQKEY as RQKEY_PROFILE} from '#/state/queries/profile'
import {useServiceQuery} from '#/state/queries/service'
import {useCurrentAccountProfile} from '#/state/queries/useCurrentAccountProfile'
import {useAgent, useSession} from '#/state/session'
import {ErrorScreen} from '#/view/com/util/error/ErrorScreen'
import {atoms as a, native, useBreakpoints, useTheme} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {Button, ButtonIcon, ButtonText} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as TextField from '#/components/forms/TextField'
import * as ToggleButton from '#/components/forms/ToggleButton'
import {
  ArrowLeft_Stroke2_Corner0_Rounded as ArrowLeftIcon,
  ArrowRight_Stroke2_Corner0_Rounded as ArrowRightIcon,
} from '#/components/icons/Arrow'
import {At_Stroke2_Corner0_Rounded as AtIcon} from '#/components/icons/At'
import {CheckThick_Stroke2_Corner0_Rounded as CheckIcon} from '#/components/icons/Check'
import {SquareBehindSquare4_Stroke2_Corner0_Rounded as CopyIcon} from '#/components/icons/SquareBehindSquare4'
import {InlineLinkText} from '#/components/Link'
import {Loader} from '#/components/Loader'
import {Text} from '#/components/Typography'
import {useSimpleVerificationState} from '#/components/verification'
import {CopyButton} from './CopyButton'

export function ChangeUsernameDialog({
  control,
}: {
  control: Dialog.DialogControlProps
}) {
  const {height} = useWindowDimensions()

  return (
    <Dialog.Outer control={control} nativeOptions={{minHeight: height}}>
      <ChangeUsernameDialogInner />
    </Dialog.Outer>
  )
}

function ChangeUsernameDialogInner() {
  const control = Dialog.useDialogContext()
  const {_} = useLingui()
  const agent = useAgent()
  const {
    data: serviceInfo,
    error: serviceInfoError,
    refetch,
  } = useServiceQuery(agent.serviceUrl.toString())

  const [page, setPage] = useState<'provided-username' | 'own-username'>(
    'provided-username',
  )

  const cancelButton = useCallback(
    () => (
      <Button
        label={_(msg`Cancel`)}
        onPress={() => control.close()}
        size="small"
        color="primary"
        variant="ghost"
        style={[a.rounded_full]}>
        <ButtonText style={[a.text_md]}>
          <Trans>Cancel</Trans>
        </ButtonText>
      </Button>
    ),
    [control, _],
  )

  return (
    <Dialog.ScrollableInner
      label={_(msg`Change Username`)}
      header={
        <Dialog.Header renderLeft={cancelButton}>
          <Dialog.HeaderText>
            <Trans>Change Username</Trans>
          </Dialog.HeaderText>
        </Dialog.Header>
      }
      contentContainerStyle={[a.pt_0, a.px_0]}>
      <View style={[a.flex_1, a.pt_lg, a.px_xl]}>
        {serviceInfoError ? (
          <ErrorScreen
            title={_(msg`Oops!`)}
            message={_(msg`There was an issue fetching your service info`)}
            details={cleanError(serviceInfoError)}
            onPressTryAgain={refetch}
          />
        ) : serviceInfo ? (
          <LayoutAnimationConfig skipEntering skipExiting>
            {page === 'provided-username' ? (
              <Animated.View
                key={page}
                entering={native(SlideInLeft)}
                exiting={native(SlideOutLeft)}>
                <ProvidedUsernamePage
                  serviceInfo={serviceInfo}
                  goToOwnUsername={() => setPage('own-username')}
                />
              </Animated.View>
            ) : (
              <Animated.View
                key={page}
                entering={native(SlideInRight)}
                exiting={native(SlideOutRight)}>
                <OwnUsernamePage
                  goToServiceUsername={() => setPage('provided-username')}
                />
              </Animated.View>
            )}
          </LayoutAnimationConfig>
        ) : (
          <View style={[a.flex_1, a.justify_center, a.align_center, a.py_4xl]}>
            <Loader size="xl" />
          </View>
        )}
      </View>
    </Dialog.ScrollableInner>
  )
}

function ProvidedUsernamePage({
  serviceInfo,
  goToOwnUsername,
}: {
  serviceInfo: SonetServerDescribeServer.OutputSchema
  goToOwnUsername: () => void
}) {
  const {_} = useLingui()
  const [subdomain, setSubdomain] = useState('')
  const agent = useAgent()
  const control = Dialog.useDialogContext()
  const {currentAccount} = useSession()
  const queryClient = useQueryClient()
  const profile = useCurrentAccountProfile()
  const verification = useSimpleVerificationState({
    profile,
  })

  const {
    mutate: changeUsername,
    isPending,
    error,
    isSuccess,
  } = useUpdateUsernameMutation({
    onSuccess: () => {
      if (currentAccount) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_PROFILE(currentAccount.userId),
        })
      }
      agent.resumeSession(agent.session!).then(() => control.close())
    },
  })

  const host = serviceInfo.availableUserDomains[0]

  const validation = useMemo(
    () => validateServiceUsername(subdomain, host),
    [subdomain, host],
  )

  const isInvalid =
    !validation.usernameChars ||
    !validation.hyphenStartOrEnd ||
    !validation.totalLength

  return (
    <LayoutAnimationConfig skipEntering>
      <View style={[a.flex_1, a.gap_md]}>
        {isSuccess && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <SuccessMessage text={_(msg`Username changed!`)} />
          </Animated.View>
        )}
        {error && (
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <ChangeUsernameError error={error} />
          </Animated.View>
        )}
        <Animated.View
          layout={native(LinearTransition)}
          style={[a.flex_1, a.gap_md]}>
          {verification.isVerified && verification.role === 'default' && (
            <Admonition type="error">
              <Trans>
                You are verified. You will lose your verification status if you
                change your username.{' '}
                <InlineLinkText
                  label={_(msg`Learn more`)}
                  to={urls.website.blog.initialVerificationAnnouncement}>
                  <Trans>Learn more.</Trans>
                </InlineLinkText>
              </Trans>
            </Admonition>
          )}
          <View>
            <TextField.LabelText>
              <Trans>New username</Trans>
            </TextField.LabelText>
            <TextField.Root isInvalid={isInvalid}>
              <TextField.Icon icon={AtIcon} />
              <Dialog.Input
                editable={!isPending}
                defaultValue={subdomain}
                onChangeText={text => setSubdomain(text)}
                label={_(msg`New username`)}
                placeholder={_(msg`e.g. alice`)}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextField.SuffixText label={host} style={[{maxWidth: '40%'}]}>
                {host}
              </TextField.SuffixText>
            </TextField.Root>
          </View>
          <Text>
            <Trans>
              Your full username will be{' '}
              <Text style={[a.font_bold]}>
                @{createFullUsername(subdomain, host)}
              </Text>
            </Trans>
          </Text>
          <Button
            label={_(msg`Save new username`)}
            variant="solid"
            size="large"
            color={validation.overall ? 'primary' : 'secondary'}
            disabled={!validation.overall}
            onPress={() => {
              if (validation.overall) {
                changeUsername({username: createFullUsername(subdomain, host)})
              }
            }}>
            {isPending ? (
              <ButtonIcon icon={Loader} />
            ) : (
              <ButtonText>
                <Trans>Save</Trans>
              </ButtonText>
            )}
          </Button>
          <Text style={[a.leading_snug]}>
            <Trans>
              If you have your own domain, you can use that as your username. This
              lets you self-verify your identity.{' '}
              <InlineLinkText
                label={_(msg`learn more`)}
                to="https://sonet.social/about/blog/4-28-2023-domain-username-tutorial"
                style={[a.font_bold]}
                disableMismatchWarning>
                Learn more here.
              </InlineLinkText>
            </Trans>
          </Text>
          <Button
            label={_(msg`I have my own domain`)}
            variant="outline"
            color="primary"
            size="large"
            onPress={goToOwnUsername}>
            <ButtonText>
              <Trans>I have my own domain</Trans>
            </ButtonText>
            <ButtonIcon icon={ArrowRightIcon} position="right" />
          </Button>
        </Animated.View>
      </View>
    </LayoutAnimationConfig>
  )
}

function OwnUsernamePage({goToServiceUsername}: {goToServiceUsername: () => void}) {
  const {_} = useLingui()
  const t = useTheme()
  const {currentAccount} = useSession()
  const [dnsPanel, setDNSPanel] = useState(true)
  const [domain, setDomain] = useState('')
  const agent = useAgent()
  const control = Dialog.useDialogContext()
  const fetchDid = useFetchDid()
  const queryClient = useQueryClient()

  const {
    mutate: changeUsername,
    isPending,
    error,
    isSuccess,
  } = useUpdateUsernameMutation({
    onSuccess: () => {
      if (currentAccount) {
        queryClient.invalidateQueries({
          queryKey: RQKEY_PROFILE(currentAccount.userId),
        })
      }
      agent.resumeSession(agent.session!).then(() => control.close())
    },
  })

  const {
    mutate: verify,
    isPending: isVerifyPending,
    isSuccess: isVerified,
    error: verifyError,
    reset: resetVerification,
  } = useMutation<true, Error | DidMismatchError>({
    mutationKey: ['verify-username', domain],
    mutationFn: async () => {
      const userId = await fetchDid(domain)
      if (userId !== currentAccount?.userId) {
        throw new DidMismatchError(userId)
      }
      return true
    },
  })

  return (
    <View style={[a.flex_1, a.gap_lg]}>
      {isSuccess && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <SuccessMessage text={_(msg`Username changed!`)} />
        </Animated.View>
      )}
      {error && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <ChangeUsernameError error={error} />
        </Animated.View>
      )}
      {verifyError && (
        <Animated.View entering={FadeIn} exiting={FadeOut}>
          <Admonition type="error">
            {verifyError instanceof DidMismatchError ? (
              <Trans>
                Wrong UserID returned from server. Received: {verifyError.userId}
              </Trans>
            ) : (
              <Trans>Failed to verify username. Please try again.</Trans>
            )}
          </Admonition>
        </Animated.View>
      )}
      <Animated.View
        layout={native(LinearTransition)}
        style={[a.flex_1, a.gap_md, a.overflow_hidden]}>
        <View>
          <TextField.LabelText>
            <Trans>Enter the domain you want to use</Trans>
          </TextField.LabelText>
          <TextField.Root>
            <TextField.Icon icon={AtIcon} />
            <Dialog.Input
              label={_(msg`New username`)}
              placeholder={_(msg`e.g. alice.com`)}
              editable={!isPending}
              defaultValue={domain}
              onChangeText={text => {
                setDomain(text)
                resetVerification()
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </TextField.Root>
        </View>
        <ToggleButton.Group
          label={_(msg`Choose domain verification method`)}
          values={[dnsPanel ? 'dns' : 'file']}
          onChange={values => setDNSPanel(values[0] === 'dns')}>
          <ToggleButton.Button name="dns" label={_(msg`DNS Panel`)}>
            <ToggleButton.ButtonText>
              <Trans>DNS Panel</Trans>
            </ToggleButton.ButtonText>
          </ToggleButton.Button>
          <ToggleButton.Button name="file" label={_(msg`No DNS Panel`)}>
            <ToggleButton.ButtonText>
              <Trans>No DNS Panel</Trans>
            </ToggleButton.ButtonText>
          </ToggleButton.Button>
        </ToggleButton.Group>
        {dnsPanel ? (
          <>
            <Text>
              <Trans>Add the following DNS record to your domain:</Trans>
            </Text>
            <View
              style={[
                t.atoms.bg_contrast_25,
                a.rounded_sm,
                a.p_md,
                a.border,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[t.atoms.text_contrast_medium]}>
                <Trans>Host:</Trans>
              </Text>
              <View style={[a.py_xs]}>
                <CopyButton
                  variant="solid"
                  color="secondary"
                  value="_atproto"
                  label={_(msg`Copy host`)}
                  hoverStyle={[a.bg_transparent]}
                  hitSlop={HITSLOP_10}>
                  <Text style={[a.text_md, a.flex_1]}>_atproto</Text>
                  <ButtonIcon icon={CopyIcon} />
                </CopyButton>
              </View>
              <Text style={[a.mt_xs, t.atoms.text_contrast_medium]}>
                <Trans>Type:</Trans>
              </Text>
              <View style={[a.py_xs]}>
                <Text style={[a.text_md]}>TXT</Text>
              </View>
              <Text style={[a.mt_xs, t.atoms.text_contrast_medium]}>
                <Trans>Value:</Trans>
              </Text>
              <View style={[a.py_xs]}>
                <CopyButton
                  variant="solid"
                  color="secondary"
                  value={'userId=' + currentAccount?.userId}
                  label={_(msg`Copy TXT record value`)}
                  hoverStyle={[a.bg_transparent]}
                  hitSlop={HITSLOP_10}>
                  <Text style={[a.text_md, a.flex_1]}>
                    userId={currentAccount?.userId}
                  </Text>
                  <ButtonIcon icon={CopyIcon} />
                </CopyButton>
              </View>
            </View>
            <Text>
              <Trans>This should create a domain record at:</Trans>
            </Text>
            <View
              style={[
                t.atoms.bg_contrast_25,
                a.rounded_sm,
                a.p_md,
                a.border,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[a.text_md]}>_atproto.{domain}</Text>
            </View>
          </>
        ) : (
          <>
            <Text>
              <Trans>Upload a text file to:</Trans>
            </Text>
            <View
              style={[
                t.atoms.bg_contrast_25,
                a.rounded_sm,
                a.p_md,
                a.border,
                t.atoms.border_contrast_low,
              ]}>
              <Text style={[a.text_md]}>
                https://{domain}/.well-known/atproto-userId
              </Text>
            </View>
            <Text>
              <Trans>That contains the following:</Trans>
            </Text>
            <CopyButton
              value={currentAccount?.userId ?? ''}
              label={_(msg`Copy UserID`)}
              size="large"
              variant="solid"
              color="secondary"
              style={[a.px_md, a.border, t.atoms.border_contrast_low]}>
              <Text style={[a.text_md, a.flex_1]}>{currentAccount?.userId}</Text>
              <ButtonIcon icon={CopyIcon} />
            </CopyButton>
          </>
        )}
      </Animated.View>
      {isVerified && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          layout={native(LinearTransition)}>
          <SuccessMessage text={_(msg`Domain verified!`)} />
        </Animated.View>
      )}
      <Animated.View layout={native(LinearTransition)}>
        {currentAccount?.username?.endsWith('.sonet.social') && (
          <Admonition type="info" style={[a.mb_md]}>
            <Trans>
              Your current username{' '}
              <Text style={[a.font_bold]}>
                {sanitizeUsername(currentAccount?.username || '', '@')}
              </Text>{' '}
              will automatically remain reserved for you. You can switch back to
              it at any time from this account.
            </Trans>
          </Admonition>
        )}
        <Button
          label={
            isVerified
              ? _(msg`Update to ${domain}`)
              : dnsPanel
                ? _(msg`Verify DNS Record`)
                : _(msg`Verify Text File`)
          }
          variant="solid"
          size="large"
          color="primary"
          disabled={domain.trim().length === 0}
          onPress={() => {
            if (isVerified) {
              changeUsername({username: domain})
            } else {
              verify()
            }
          }}>
          {isPending || isVerifyPending ? (
            <ButtonIcon icon={Loader} />
          ) : (
            <ButtonText>
              {isVerified ? (
                <Trans>Update to {domain}</Trans>
              ) : dnsPanel ? (
                <Trans>Verify DNS Record</Trans>
              ) : (
                <Trans>Verify Text File</Trans>
              )}
            </ButtonText>
          )}
        </Button>

        <Button
          label={_(msg`Use default provider`)}
          accessibilityHint={_(msg`Returns to previous page`)}
          onPress={goToServiceUsername}
          variant="outline"
          color="secondary"
          size="large"
          style={[a.mt_sm]}>
          <ButtonIcon icon={ArrowLeftIcon} position="left" />
          <ButtonText>
            <Trans>Nevermind, create a username for me</Trans>
          </ButtonText>
        </Button>
      </Animated.View>
    </View>
  )
}

class DidMismatchError extends Error {
  userId: string
  constructor(userId: string) {
    super('UserID mismatch')
    this.name = 'DidMismatchError'
    this.userId = userId
  }
}

function ChangeUsernameError({error}: {error: unknown}) {
  const {_} = useLingui()

  let message = _(msg`Failed to change username. Please try again.`)

  if (error instanceof Error) {
    if (error.message.startsWith('Username already taken')) {
      message = _(msg`Username already taken. Please try a different one.`)
    } else if (error.message === 'Reserved username') {
      message = _(msg`This username is reserved. Please try a different one.`)
    } else if (error.message === 'Username too long') {
      message = _(msg`Username too long. Please try a shorter one.`)
    } else if (error.message === 'Input/username must be a valid username') {
      message = _(msg`Invalid username. Please try a different one.`)
    } else if (error.message === 'Rate Limit Exceeded') {
      message = _(
        msg`Rate limit exceeded – you've tried to change your username too many times in a short period. Please wait a minute before trying again.`,
      )
    }
  }

  return <Admonition type="error">{message}</Admonition>
}

function SuccessMessage({text}: {text: string}) {
  const {gtMobile} = useBreakpoints()
  const t = useTheme()
  return (
    <View
      style={[
        a.flex_1,
        a.gap_md,
        a.flex_row,
        a.justify_center,
        a.align_center,
        gtMobile ? a.px_md : a.px_sm,
        a.py_xs,
        t.atoms.border_contrast_low,
      ]}>
      <View
        style={[
          {height: 20, width: 20},
          a.rounded_full,
          a.align_center,
          a.justify_center,
          {backgroundColor: t.palette.positive_600},
        ]}>
        <CheckIcon fill={t.palette.white} size="xs" />
      </View>
      <Text style={[a.text_md]}>{text}</Text>
    </View>
  )
}

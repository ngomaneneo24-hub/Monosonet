import {useMemo, useState} from 'react'
import {View} from 'react-native'
import {
  type SonetNotificationDefs,
  type SonetNotificationListActivitySubscriptions,
  type ModerationOpts,
  type Un$Typed,
} from '@sonet/api'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {
  type InfiniteData,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'

import {createSanitizedDisplayName} from '#/lib/moderation/create-sanitized-display-name'
import {cleanError} from '#/lib/strings/errors'
import {sanitizeUsername} from '#/lib/strings/usernames'
import {logger} from '#/logger'
import {isWeb} from '#/platform/detection'
import {updateProfileShadow} from '#/state/cache/profile-shadow'
import {RQKEY_getActivitySubscriptions} from '#/state/queries/activity-subscriptions'
import {useAgent} from '#/state/session'
import * as Toast from '#/view/com/util/Toast'
import {platform, useTheme, web} from '#/alf'
import {atoms as a} from '#/alf'
import {Admonition} from '#/components/Admonition'
import {
  Button,
  ButtonIcon,
  type ButtonProps,
  ButtonText,
} from '#/components/Button'
import * as Dialog from '#/components/Dialog'
import * as Toggle from '#/components/forms/Toggle'
import {Loader} from '#/components/Loader'
import * as ProfileCard from '#/components/ProfileCard'
import {Text} from '#/components/Typography'
import type * as bsky from '#/types/bsky'

export function SubscribeProfileDialog({
  control,
  profile,
  moderationOpts,
  includeProfile,
}: {
  control: Dialog.DialogControlProps
  profile: bsky.profile.AnyProfileView
  moderationOpts: ModerationOpts
  includeProfile?: boolean
}) {
  return (
    <Dialog.Outer control={control} nativeOptions={{preventExpansion: true}}>
      <Dialog.Username />
      <DialogInner
        profile={profile}
        moderationOpts={moderationOpts}
        includeProfile={includeProfile}
      />
    </Dialog.Outer>
  )
}

function DialogInner({
  profile,
  moderationOpts,
  includeProfile,
}: {
  profile: bsky.profile.AnyProfileView
  moderationOpts: ModerationOpts
  includeProfile?: boolean
}) {
  const {_} = useLingui()
  const t = useTheme()
  const agent = useAgent()
  const control = Dialog.useDialogContext()
  const queryClient = useQueryClient()
  const initialState = parseActivitySubscription(
    profile.viewer?.activitySubscription,
  )
  const [state, setState] = useState(initialState)

  const values = useMemo(() => {
    const {note, reply} = state
    const res = []
    if (note) res.push('note')
    if (reply) res.push('reply')
    return res
  }, [state])

  const onChange = (newValues: string[]) => {
    setState(oldValues => {
      // ensure you can't have reply without note
      if (!oldValues.reply && newValues.includes('reply')) {
        return {
          note: true,
          reply: true,
        }
      }

      if (oldValues.note && !newValues.includes('note')) {
        return {
          note: false,
          reply: false,
        }
      }

      return {
        note: newValues.includes('note'),
        reply: newValues.includes('reply'),
      }
    })
  }

  const {
    mutate: saveChanges,
    isPending: isSaving,
    error,
  } = useMutation({
    mutationFn: async (
      activitySubscription: Un$Typed<SonetNotificationDefs.ActivitySubscription>,
    ) => {
      await agent.app.sonet.notification.putActivitySubscription({
        subject: profile.userId,
        activitySubscription,
      })
    },
    onSuccess: (_data, activitySubscription) => {
      control.close(() => {
        updateProfileShadow(queryClient, profile.userId, {
          activitySubscription,
        })

        if (!activitySubscription.note && !activitySubscription.reply) {
          logger.metric('activitySubscription:disable', {})
          Toast.show(
            _(
              msg`You will no longer receive notifications for ${sanitizeUsername(profile.username, '@')}`,
            ),
            'check',
          )

          // filter out the subscription
          queryClient.setQueryData(
            RQKEY_getActivitySubscriptions,
            (
              old?: InfiniteData<SonetNotificationListActivitySubscriptions.OutputSchema>,
            ) => {
              if (!old) return old
              return {
                ...old,
                pages: old.pages.map(page => ({
                  ...page,
                  subscriptions: page.subscriptions.filter(
                    item => item.userId !== profile.userId,
                  ),
                })),
              }
            },
          )
        } else {
          logger.metric('activitySubscription:enable', {
            setting: activitySubscription.reply ? 'notes_and_replies' : 'notes',
          })
          if (!initialState.note && !initialState.reply) {
            Toast.show(
              _(
                msg`You'll start receiving notifications for ${sanitizeUsername(profile.username, '@')}!`,
              ),
              'check',
            )
          } else {
            Toast.show(_(msg`Changes saved`), 'check')
          }
        }
      })
    },
    onError: err => {
      logger.error('Could not save activity subscription', {message: err})
    },
  })

  const buttonProps: Omit<ButtonProps, 'children'> = useMemo(() => {
    const isDirty =
      state.note !== initialState.note || state.reply !== initialState.reply
    const hasAny = state.note || state.reply

    if (isDirty) {
      return {
        label: _(msg`Save changes`),
        color: hasAny ? 'primary' : 'negative',
        onPress: () => saveChanges(state),
        disabled: isSaving,
      }
    } else {
      // on web, a disabled save button feels more natural than a massive close button
      if (isWeb) {
        return {
          label: _(msg`Save changes`),
          color: 'secondary',
          disabled: true,
        }
      } else {
        return {
          label: _(msg`Cancel`),
          color: 'secondary',
          onPress: () => control.close(),
        }
      }
    }
  }, [state, initialState, control, _, isSaving, saveChanges])

  const name = createSanitizedDisplayName(profile, false)

  return (
    <Dialog.ScrollableInner
      style={web({maxWidth: 400})}
      label={_(msg`Get notified of new notes from ${name}`)}>
      <View style={[a.gap_lg]}>
        <View style={[a.gap_xs]}>
          <Text style={[a.font_heavy, a.text_2xl]}>
            <Trans>Keep me noteed</Trans>
          </Text>
          <Text style={[t.atoms.text_contrast_medium, a.text_md]}>
            <Trans>Get notified of this account’s activity</Trans>
          </Text>
        </View>

        {includeProfile && (
          <ProfileCard.Header>
            <ProfileCard.Avatar
              profile={profile}
              moderationOpts={moderationOpts}
              disabledPreview
            />
            <ProfileCard.NameAndUsername
              profile={profile}
              moderationOpts={moderationOpts}
            />
          </ProfileCard.Header>
        )}

        <Toggle.Group
          label={_(msg`Subscribe to account activity`)}
          values={values}
          onChange={onChange}>
          <View style={[a.gap_sm]}>
            <Toggle.Item
              label={_(msg`Notes`)}
              name="note"
              style={[
                a.flex_1,
                a.py_xs,
                platform({
                  native: [a.justify_between],
                  web: [a.flex_row_reverse, a.gap_sm],
                }),
              ]}>
              <Toggle.LabelText
                style={[t.atoms.text, a.font_normal, a.text_md, a.flex_1]}>
                <Trans>Notes</Trans>
              </Toggle.LabelText>
              <Toggle.Switch />
            </Toggle.Item>
            <Toggle.Item
              label={_(msg`Replies`)}
              name="reply"
              style={[
                a.flex_1,
                a.py_xs,
                platform({
                  native: [a.justify_between],
                  web: [a.flex_row_reverse, a.gap_sm],
                }),
              ]}>
              <Toggle.LabelText
                style={[t.atoms.text, a.font_normal, a.text_md, a.flex_1]}>
                <Trans>Replies</Trans>
              </Toggle.LabelText>
              <Toggle.Switch />
            </Toggle.Item>
          </View>
        </Toggle.Group>

        {error && (
          <Admonition type="error">
            <Trans>Could not save changes: {cleanError(error)}</Trans>
          </Admonition>
        )}

        <Button {...buttonProps} size="large" variant="solid">
          <ButtonText>{buttonProps.label}</ButtonText>
          {isSaving && <ButtonIcon icon={Loader} />}
        </Button>
      </View>

      <Dialog.Close />
    </Dialog.ScrollableInner>
  )
}

function parseActivitySubscription(
  sub?: SonetNotificationDefs.ActivitySubscription,
): Un$Typed<SonetNotificationDefs.ActivitySubscription> {
  if (!sub) return {note: false, reply: false}
  const {note, reply} = sub
  return {note, reply}
}

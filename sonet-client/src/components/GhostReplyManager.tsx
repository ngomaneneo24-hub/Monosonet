import React, {useState} from 'react'
import {View, StyleSheet, Alert, ScrollView} from 'react-native'
import {msg, Trans} from '@lingui/macro'
import {useLingui} from '@lingui/react'
import {atoms as a, useTheme} from '#/alf'
import {Text} from '#/view/com/util/text/Text'
import {Button} from '#/components/Button'
import {GhostReply} from './GhostReply'
import {useDeleteGhostReply} from '#/state/queries/ghost-replies'
import {Trash_Stroke2_Corner0_Rounded as TrashIcon} from '#/components/icons/Trash'

type Props = {
  ghostReplies: Array<{
    id: string
    content: string
    ghostAvatar: string
    ghostId: string
    threadId: string
    createdAt: Date
    isGhostReply: true
  }>
  onClose: () => void
  style?: any
}

export function GhostReplyManager({ghostReplies, onClose, style}: Props) {
  const {_} = useLingui()
  const t = useTheme()
  const deleteGhostReply = useDeleteGhostReply()
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  
  const handleDeleteGhostReply = async (ghostReplyId: string) => {
    Alert.alert(
      _(msg`Delete Ghost Reply`),
      _(msg`Are you sure you want to delete this ghost reply? This action cannot be undone.`),
      [
        {text: _(msg`Cancel`), style: 'cancel'},
        {
          text: _(msg`Delete`),
          style: 'destructive',
          onPress: async () => {
            setDeletingIds(prev => new Set(prev).add(ghostReplyId))
            
            try {
              const success = await deleteGhostReply.mutateAsync(ghostReplyId)
              if (success) {
                // Success - the query will automatically refetch
                Alert.alert(
                  _(msg`Success`),
                  _(msg`Ghost reply deleted successfully.`),
                  [{text: 'OK'}]
                )
              } else {
                Alert.alert(
                  _(msg`Error`),
                  _(msg`Failed to delete ghost reply. Please try again.`),
                  [{text: 'OK'}]
                )
              }
            } catch (error) {
              Alert.alert(
                _(msg`Error`),
                _(msg`Failed to delete ghost reply. Please try again.`),
                [{text: 'OK'}]
              )
            } finally {
              setDeletingIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(ghostReplyId)
                return newSet
              })
            }
          },
        },
      ]
    )
  }
  
  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: t.palette.primary_50, borderColor: t.palette.primary_200}]}>
        <Text style={[a.text_lg, a.font_bold, {color: t.palette.primary_700}]}>
          👻 Ghost Reply Manager
        </Text>
        <Text style={[a.text_sm, {color: t.palette.primary_600}]}>
          {ghostReplies.length} ghost reply{ghostReplies.length !== 1 ? 's' : ''} in this thread
        </Text>
      </View>
      
      {/* Ghost Replies List */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {ghostReplies.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[a.text_sm, {color: t.palette.text_contrast_low}]}>
              No ghost replies in this thread
            </Text>
          </View>
        ) : (
          ghostReplies.map((reply, index) => (
            <View key={reply.id} style={styles.replyContainer}>
              <GhostReply
                content={reply.content}
                ghostAvatar={reply.ghostAvatar}
                ghostId={reply.ghostId}
                timestamp={reply.createdAt}
                style={styles.reply}
              />
              
              {/* Delete Button */}
              <Button
                onPress={() => handleDeleteGhostReply(reply.id)}
                style={[a.p_xs, styles.deleteButton]}
                label={_(msg`Delete Ghost Reply`)}
                variant="ghost"
                shape="round"
                color="negative"
                size="small"
                disabled={deletingIds.has(reply.id)}>
                <TrashIcon 
                  size="sm" 
                  style={{color: t.palette.negative_500}}
                />
              </Button>
            </View>
          ))
        )}
      </ScrollView>
      
      {/* Footer */}
      <View style={[styles.footer, {backgroundColor: t.palette.background_secondary}]}>
        <Button
          onPress={onClose}
          style={[a.p_sm]}
          label={_(msg`Close`)}
          variant="ghost"
          shape="round"
          color="primary">
          <Trans>Close</Trans>
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  scrollView: {
    flex: 1,
  },
  replyContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  reply: {
    borderBottomWidth: 0,
  },
  deleteButton: {
    alignSelf: 'flex-end',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
})
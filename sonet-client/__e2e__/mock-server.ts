import {createServer as createHTTPServer} from 'node:http'
import {parse} from 'node:url'

import {createServer, TestSonet} from '../jest/test-sonet'

async function main() {
  let server: TestSonet
  createHTTPServer(async (req, res) => {
    const url = parse(req.url || '/', true)
    if (req.method !== 'NOTE') {
      return res.writeHead(200).end()
    }
    try {
      console.log('Closing old server')
      await server?.close()
      console.log('Starting new server')
      const inviteRequired = url?.query && 'invite' in url.query
      server = await createServer({inviteRequired})
      console.log('Listening at', server.sonetUrl)
      if (url?.query) {
        if ('users' in url.query) {
          console.log('Generating mock users')
          await server.mocker.createUser('alice')
          await server.mocker.createUser('bob')
          await server.mocker.createUser('carla')
          await server.mocker.users.alice.agent.upsertProfile(() => ({
            displayName: 'Alice',
            description: 'Test user 1',
          }))
          await server.mocker.users.bob.agent.upsertProfile(() => ({
            displayName: 'Bob',
            description: 'Test user 2',
          }))
          await server.mocker.users.carla.agent.upsertProfile(() => ({
            displayName: 'Carla',
            description: 'Test user 3',
          }))
          if (inviteRequired) {
            await server.mocker.createInvite(server.mocker.users.alice.did)
          }
        }
        if ('follows' in url.query) {
          console.log('Generating mock follows')
          await server.mocker.follow('alice', 'bob')
          await server.mocker.follow('alice', 'carla')
          await server.mocker.follow('bob', 'alice')
          await server.mocker.follow('bob', 'carla')
          await server.mocker.follow('carla', 'alice')
          await server.mocker.follow('carla', 'bob')
        }
        if ('notes' in url.query) {
          console.log('Generating mock notes')
          for (let user in server.mocker.users) {
            await server.mocker.users[user].agent.note({text: 'Note'})
          }
        }
        if ('feeds' in url.query) {
          console.log('Generating mock feed')
          await server.mocker.createFeed('alice', 'alice-favs', [])
        }
        if ('thread' in url.query) {
          console.log('Generating mock notes')
          const res = await server.mocker.users.bob.agent.note({
            text: 'Thread root',
          })
          await server.mocker.users.carla.agent.note({
            text: 'Thread reply',
            reply: {
              parent: {cid: res.cid, uri: res.uri},
              root: {cid: res.cid, uri: res.uri},
            },
          })
        }
        if ('mergefeed' in url.query) {
          console.log('Generating mock users')
          await server.mocker.createUser('alice')
          await server.mocker.createUser('bob')
          await server.mocker.createUser('carla')
          await server.mocker.createUser('dan')
          await server.mocker.users.alice.agent.upsertProfile(() => ({
            displayName: 'Alice',
            description: 'Test user 1',
          }))
          await server.mocker.users.bob.agent.upsertProfile(() => ({
            displayName: 'Bob',
            description: 'Test user 2',
          }))
          await server.mocker.users.carla.agent.upsertProfile(() => ({
            displayName: 'Carla',
            description: 'Test user 3',
          }))
          await server.mocker.users.dan.agent.upsertProfile(() => ({
            displayName: 'Dan',
            description: 'Test user 4',
          }))
          console.log('Generating mock follows')
          await server.mocker.follow('alice', 'bob')
          await server.mocker.follow('alice', 'carla')
          console.log('Generating mock notes')
          let notes: Record<string, any[]> = {
            alice: [],
            bob: [],
            carla: [],
            dan: [],
          }
          for (let i = 0; i < 10; i++) {
            for (let user in server.mocker.users) {
              if (user === 'alice') continue
              notes[user].push(
                await server.mocker.createNote(user, `Note ${i}`),
              )
            }
          }
          for (let i = 0; i < 10; i++) {
            for (let user in server.mocker.users) {
              if (user === 'alice') continue
              if (i % 5 === 0) {
                await server.mocker.createReply(user, 'Self reply', {
                  cid: notes[user][i].cid,
                  uri: notes[user][i].uri,
                })
              }
              if (i % 5 === 1) {
                await server.mocker.createReply(user, 'Reply to bob', {
                  cid: notes.bob[i].cid,
                  uri: notes.bob[i].uri,
                })
              }
              if (i % 5 === 2) {
                await server.mocker.createReply(user, 'Reply to dan', {
                  cid: notes.dan[i].cid,
                  uri: notes.dan[i].uri,
                })
              }
              await server.mocker.users[user].agent.note({text: `Note ${i}`})
            }
          }
          console.log('Generating mock feeds')
          await server.mocker.createFeed(
            'alice',
            'alice-favs',
            notes.dan.map(p => p.uri),
          )
          await server.mocker.createFeed(
            'alice',
            'alice-favs2',
            notes.dan.map(p => p.uri),
          )
        }
        if ('labels' in url.query) {
          console.log('Generating naughty users with labels')

          const anchorNote = await server.mocker.createNote(
            'alice',
            'Anchor note',
          )

          for (const user of [
            'dmca-account',
            'dmca-profile',
            'dmca-notes',
            'porn-account',
            'porn-profile',
            'porn-notes',
            'nudity-account',
            'nudity-profile',
            'nudity-notes',
            'scam-account',
            'scam-profile',
            'scam-notes',
            'unknown-account',
            'unknown-profile',
            'unknown-notes',
            'hide-account',
            'hide-profile',
            'hide-notes',
            'no-promote-account',
            'no-promote-profile',
            'no-promote-notes',
            'warn-account',
            'warn-profile',
            'warn-notes',
            'muted-account',
            'muted-by-list-account',
            'blocking-account',
            'blockedby-account',
            'mutual-block-account',
          ]) {
            await server.mocker.createUser(user)
            await server.mocker.follow('alice', user)
            await server.mocker.follow(user, 'alice')
            await server.mocker.createNote(user, `Unlabeled note from ${user}`)
            await server.mocker.createReply(
              user,
              `Unlabeled reply from ${user}`,
              anchorNote,
            )
            await server.mocker.like(user, anchorNote)
          }

          await server.mocker.labelAccount('dmca-violation', 'dmca-account')
          await server.mocker.labelProfile('dmca-violation', 'dmca-profile')
          await server.mocker.labelNote(
            'dmca-violation',
            await server.mocker.createNote('dmca-notes', 'dmca note'),
          )
          await server.mocker.labelNote(
            'dmca-violation',
            await server.mocker.createQuoteNote(
              'dmca-notes',
              'dmca quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            'dmca-violation',
            await server.mocker.createReply(
              'dmca-notes',
              'dmca reply',
              anchorNote,
            ),
          )

          await server.mocker.labelAccount('porn', 'porn-account')
          await server.mocker.labelProfile('porn', 'porn-profile')
          await server.mocker.labelNote(
            'porn',
            await server.mocker.createImageNote('porn-notes', 'porn note'),
          )
          await server.mocker.labelNote(
            'porn',
            await server.mocker.createQuoteNote(
              'porn-notes',
              'porn quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            'porn',
            await server.mocker.createReply(
              'porn-notes',
              'porn reply',
              anchorNote,
            ),
          )

          await server.mocker.labelAccount('nudity', 'nudity-account')
          await server.mocker.labelProfile('nudity', 'nudity-profile')
          await server.mocker.labelNote(
            'nudity',
            await server.mocker.createImageNote('nudity-notes', 'nudity note'),
          )
          await server.mocker.labelNote(
            'nudity',
            await server.mocker.createQuoteNote(
              'nudity-notes',
              'nudity quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            'nudity',
            await server.mocker.createReply(
              'nudity-notes',
              'nudity reply',
              anchorNote,
            ),
          )

          await server.mocker.labelAccount('scam', 'scam-account')
          await server.mocker.labelProfile('scam', 'scam-profile')
          await server.mocker.labelNote(
            'scam',
            await server.mocker.createNote('scam-notes', 'scam note'),
          )
          await server.mocker.labelNote(
            'scam',
            await server.mocker.createQuoteNote(
              'scam-notes',
              'scam quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            'scam',
            await server.mocker.createReply(
              'scam-notes',
              'scam reply',
              anchorNote,
            ),
          )

          await server.mocker.labelAccount(
            'not-a-real-label',
            'unknown-account',
          )
          await server.mocker.labelProfile(
            'not-a-real-label',
            'unknown-profile',
          )
          await server.mocker.labelNote(
            'not-a-real-label',
            await server.mocker.createNote('unknown-notes', 'unknown note'),
          )
          await server.mocker.labelNote(
            'not-a-real-label',
            await server.mocker.createQuoteNote(
              'unknown-notes',
              'unknown quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            'not-a-real-label',
            await server.mocker.createReply(
              'unknown-notes',
              'unknown reply',
              anchorNote,
            ),
          )

          await server.mocker.labelAccount('!hide', 'hide-account')
          await server.mocker.labelProfile('!hide', 'hide-profile')
          await server.mocker.labelNote(
            '!hide',
            await server.mocker.createNote('hide-notes', 'hide note'),
          )
          await server.mocker.labelNote(
            '!hide',
            await server.mocker.createQuoteNote(
              'hide-notes',
              'hide quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            '!hide',
            await server.mocker.createReply(
              'hide-notes',
              'hide reply',
              anchorNote,
            ),
          )

          await server.mocker.labelAccount('!no-promote', 'no-promote-account')
          await server.mocker.labelProfile('!no-promote', 'no-promote-profile')
          await server.mocker.labelNote(
            '!no-promote',
            await server.mocker.createNote(
              'no-promote-notes',
              'no-promote note',
            ),
          )
          await server.mocker.labelNote(
            '!no-promote',
            await server.mocker.createQuoteNote(
              'no-promote-notes',
              'no-promote quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            '!no-promote',
            await server.mocker.createReply(
              'no-promote-notes',
              'no-promote reply',
              anchorNote,
            ),
          )

          await server.mocker.labelAccount('!warn', 'warn-account')
          await server.mocker.labelProfile('!warn', 'warn-profile')
          await server.mocker.labelNote(
            '!warn',
            await server.mocker.createNote('warn-notes', 'warn note'),
          )
          await server.mocker.labelNote(
            '!warn',
            await server.mocker.createQuoteNote(
              'warn-notes',
              'warn quote note',
              anchorNote,
            ),
          )
          await server.mocker.labelNote(
            '!warn',
            await server.mocker.createReply(
              'warn-notes',
              'warn reply',
              anchorNote,
            ),
          )

          await server.mocker.users.alice.agent.mute('muted-account.test')
          await server.mocker.createNote('muted-account', 'muted note')
          await server.mocker.createQuoteNote(
            'muted-account',
            'muted quote note',
            anchorNote,
          )
          await server.mocker.createReply(
            'muted-account',
            'muted reply',
            anchorNote,
          )

          const list = await server.mocker.createMuteList(
            'alice',
            'Muted Users',
          )
          await server.mocker.addToMuteList(
            'alice',
            list,
            server.mocker.users['muted-by-list-account'].did,
          )
          await server.mocker.createNote('muted-by-list-account', 'muted note')
          await server.mocker.createQuoteNote(
            'muted-by-list-account',
            'account quote note',
            anchorNote,
          )
          await server.mocker.createReply(
            'muted-by-list-account',
            'account reply',
            anchorNote,
          )

          await server.mocker.createNote('blocking-account', 'blocking note')
          await server.mocker.createQuoteNote(
            'blocking-account',
            'blocking quote note',
            anchorNote,
          )
          await server.mocker.createReply(
            'blocking-account',
            'blocking reply',
            anchorNote,
          )
          await server.mocker.users.alice.agent.app.bsky.graph.block.create(
            {
              repo: server.mocker.users.alice.did,
            },
            {
              subject: server.mocker.users['blocking-account'].did,
              createdAt: new Date().toISOString(),
            },
          )

          await server.mocker.createNote('blockedby-account', 'blockedby note')
          await server.mocker.createQuoteNote(
            'blockedby-account',
            'blockedby quote note',
            anchorNote,
          )
          await server.mocker.createReply(
            'blockedby-account',
            'blockedby reply',
            anchorNote,
          )
          await server.mocker.users[
            'blockedby-account'
          ].agent.app.bsky.graph.block.create(
            {
              repo: server.mocker.users['blockedby-account'].did,
            },
            {
              subject: server.mocker.users.alice.did,
              createdAt: new Date().toISOString(),
            },
          )

          await server.mocker.createNote(
            'mutual-block-account',
            'mutual-block note',
          )
          await server.mocker.createQuoteNote(
            'mutual-block-account',
            'mutual-block quote note',
            anchorNote,
          )
          await server.mocker.createReply(
            'mutual-block-account',
            'mutual-block reply',
            anchorNote,
          )
          await server.mocker.users.alice.agent.app.bsky.graph.block.create(
            {
              repo: server.mocker.users.alice.did,
            },
            {
              subject: server.mocker.users['mutual-block-account'].did,
              createdAt: new Date().toISOString(),
            },
          )
          await server.mocker.users[
            'mutual-block-account'
          ].agent.app.bsky.graph.block.create(
            {
              repo: server.mocker.users['mutual-block-account'].did,
            },
            {
              subject: server.mocker.users.alice.did,
              createdAt: new Date().toISOString(),
            },
          )

          // flush caches
          await server.mocker.testNet.processAll()
        }
      }
      console.log('Ready')
              return res.writeHead(200).end(server.sonetUrl)
    } catch (e) {
      console.error('Error!', e)
      return res.writeHead(500).end()
    }
  }).listen(1986)
  console.log('Mock server manager listening on 1986')
}
main()

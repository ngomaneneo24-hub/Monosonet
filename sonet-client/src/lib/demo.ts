import {subDays, subMinutes} from 'date-fns'
import {SonetNote, SonetUser} from '@sonet/types'

const UserID = `userId:plc:z72i7hdynmk6r22z27h6tvur`
const NOW = new Date()
const POST_1_DATE = subMinutes(NOW, 2).toISOString()
const POST_2_DATE = subMinutes(NOW, 4).toISOString()
const POST_3_DATE = subMinutes(NOW, 5).toISOString()

export const DEMO_FEED = {
  feed: [
    {
      note: {
        id: '3lniysofyll2d',
        uri: 'sonet://note/3lniysofyll2d',
        author: {
          id: 'userId:plc:pvooorihapc2lf2pijehgrdf',
          username: 'forkedriverband.sonet.social',
          displayName: 'Forked River Band',
          avatar: 'https://sonet.social/about/adi/note_1_avi.jpg',
          bio: 'Bluegrass band from Sonoma County',
          followersCount: 1250,
          followingCount: 45,
          notesCount: 89,
          createdAt: POST_1_DATE,
          updatedAt: POST_1_DATE,
        },
        content: 'Sonoma County folks: Come tip your hats our way and see us play new and old bluegrass tunes at Sebastopol Solstice Fest on June 20th.',
        language: 'en',
        createdAt: POST_1_DATE,
        updatedAt: POST_1_DATE,
        media: [
          {
            id: 'img1',
            type: 'image',
            url: 'https://sonet.social/about/adi/note_1_image.jpg',
            thumbnail: 'https://sonet.social/about/adi/note_1_image.jpg',
            alt: 'Fake flier for Sebastapol Bluegrass Fest',
            metadata: {
              size: 562871,
              mimeType: 'image/jpeg',
              dimensions: {width: 900, height: 1350},
            },
          },
        ],
        replies: 1,
        renotes: 4,
        likes: 18,
        bookmarks: 0,
        views: 156,
        sensitive: false,
        spoilerText: undefined,
        tags: ['bluegrass', 'music', 'festival'],
      },
    },
    {
      note: {
        uri: 'sonet://userId:plc:fhhqii56ppgyh5qcm2b3mokf/app.sonet.feed.note/3lnizc7fug52c',
        cid: 'bafyreienuabsr55rycirdf4ewue5tjcseg5lzqompcsh2brqzag6hvxllm',
        author: {
          userId: 'userId:plc:fhhqii56ppgyh5qcm2b3mokf',
          username: 'dinh-designs.sonet.social',
          displayName: 'Rich Dinh Designs',
          avatar: 'https://sonet.social/about/adi/note_2_avi.jpg',
          viewer: {
            muted: false,
            blockedBy: false,
            following: `sonet://${UserID}/app.sonet.graph.follow/note2`,
          },
          labels: [],
          createdAt: POST_2_DATE,
        },
        record: {
          type: "sonet",
          createdAt: POST_2_DATE,
          // embed: {
          //   type: "sonet",
          //   images: [
          //     {
          //       alt: 'Placeholder image of interior design',
          //       aspectRatio: {
          //         height: 872,
          //         width: 598,
          //       },
          //       image: {
          //         type: "sonet",
          //         ref: {
          //           $link:
          //             'bafkreidcjc6bjb4jjjejruin5cldhj5zovsuu4tydulenyprneziq5rfeu',
          //         },
          //         mimeType: 'image/jpeg',
          //         size: 296003,
          //       },
          //     },
          //   ],
          // },
          langs: ['en'],
          text: 'Details from our install at the Lucas residence in Joshua Tree. We populated the space with rich, earthy tones and locally-sourced materials to suit the landscape.',
        },
        embed: {
          type: "sonet",
          images: [
            {
              thumb: 'https://sonet.social/about/adi/note_2_image.jpg',
              fullsize: 'https://sonet.social/about/adi/note_2_image.jpg',
              alt: 'Placeholder image of interior design',
              aspectRatio: {
                height: 872,
                width: 598,
              },
            },
          ],
        },
        replyCount: 3,
        renoteCount: 1,
        likeCount: 4,
        quoteCount: 0,
        indexedAt: POST_2_DATE,
        viewer: {
          threadMuted: false,
          embeddingDisabled: false,
        },
        labels: [],
      },
    },
    {
      note: {
        uri: 'sonet://userId:plc:h7fwnfejmmifveeea5eyxgkc/app.sonet.feed.note/3lnizna3g4f2t',
        cid: 'bafyreiepn7obmlshliori4j34texpaukrqkyyu7cq6nmpzk4lkis7nqeae',
        author: {
          userId: 'userId:plc:h7fwnfejmmifveeea5eyxgkc',
          username: 'rodyalbuerne.sonet.social',
          displayName: 'Rody Albuerne',
          avatar: 'https://sonet.social/about/adi/note_3_avi.jpg',
          viewer: {
            muted: false,
            blockedBy: false,
            following: `sonet://${UserID}/app.sonet.graph.follow/note3`,
          },
          labels: [],
          createdAt: POST_3_DATE,
        },
        record: {
          type: "sonet",
          createdAt: POST_3_DATE,
          langs: ['en'],
          text: 'Tinkering with the basics of traditional wooden joinery in my shop lately. Starting small with this ox, made using simple mortise and tenon joints.',
        },
        replyCount: 11,
        renoteCount: 97,
        likeCount: 399,
        quoteCount: 0,
        indexedAt: POST_3_DATE,
        viewer: {
          threadMuted: false,
          embeddingDisabled: false,
        },
        labels: [],
      },
    },
  ],
} satisfies SonetFeedGetFeed.OutputSchema

export const BOTTOM_BAR_AVI = 'https://sonet.social/about/adi/user_avi.jpg'

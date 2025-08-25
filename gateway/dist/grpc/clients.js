import path from 'node:path';
import url from 'node:url';
import { loadPackageDefinition, credentials } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROTO_DIR = process.env.PROTO_DIR || path.resolve(__dirname, '../../proto');
function loadProto(protoRelPath) {
    const packageDefinition = loadSync(path.join(PROTO_DIR, protoRelPath), {
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
    return loadPackageDefinition(packageDefinition);
}
const userPkgDef = loadProto('src/services/user_service_go/proto/user_service.proto');
const notePkgDef = loadProto('services/note_service.proto');
const timelinePkgDef = loadProto('services/timeline.proto');
const mediaPkgDef = loadProto('services/media.proto');
const followPkgDef = loadProto('src/services/follow_service/proto/follow_service.proto');
const messagingPkgDef = loadProto('services/messaging.proto');
const searchPkgDef = loadProto('services/search.proto');
const notificationPkgDef = loadProto('services/notification.proto');
const listPkgDef = loadProto('src/services/list_service/proto/list_service.proto');
const starterpackPkgDef = loadProto('src/services/starterpack_service/proto/starterpack_service.proto');
const draftsPkgDef = loadProto('src/services/drafts_service/proto/drafts_service.proto');
export function createGrpcClients() {
    const userTarget = process.env.USER_GRPC_ADDR || 'user-service:9090';
    const noteTarget = process.env.NOTE_GRPC_ADDR || 'note-service:9090';
    const timelineTarget = process.env.TIMELINE_GRPC_ADDR || 'timeline-service:50051';
    const mediaTarget = process.env.MEDIA_GRPC_ADDR || 'media-service:9090';
    const followTarget = process.env.FOLLOW_GRPC_ADDR || 'follow-service:9090';
    const messagingTarget = process.env.MESSAGING_GRPC_ADDR || 'messaging-service:9090';
    const searchTarget = process.env.SEARCH_GRPC_ADDR || 'search-service:9096';
    const notificationTarget = process.env.NOTIFICATION_GRPC_ADDR || 'notification-service:9097';
    const listTarget = process.env.LIST_GRPC_ADDR || 'list-service:9098';
    const starterpackTarget = process.env.STARTERPACK_GRPC_ADDR || 'starterpack-service:9099';
    const draftsTarget = process.env.DRAFTS_GRPC_ADDR || 'drafts-service:9100';
    const userPackage = userPkgDef['sonet.user.v1'];
    const notePackage = notePkgDef['sonet.note.grpc'];
    const timelinePackage = timelinePkgDef['sonet.timeline'];
    const mediaPackage = mediaPkgDef['sonet.media'];
    const followPackage = followPkgDef['sonet.follow.v1'];
    const messagingPackage = messagingPkgDef['sonet.messaging'];
    const searchPackage = searchPkgDef['sonet.search'];
    const notificationPackage = notificationPkgDef['sonet.notification'];
    const listPackage = listPkgDef['sonet.list.v1'];
    const starterpackPackage = starterpackPkgDef['sonet.starterpack.v1'];
    const draftsPackage = draftsPkgDef['sonet.drafts.v1'];
    const videoFeedPkgDef = loadProto('services/video_feed.proto');
    const analyticsPkgDef = loadProto('services/analytics.proto');
    const videoFeedPackage = videoFeedPkgDef?.['sonet.services'] || videoFeedPkgDef?.['sonet.video'] || {};
    const analyticsPackage = analyticsPkgDef?.['sonet.analytics'] || {};
    const user = new userPackage.UserService(userTarget, credentials.createInsecure());
    const note = new notePackage.NoteService(noteTarget, credentials.createInsecure());
    const timeline = new timelinePackage.TimelineService(timelineTarget, credentials.createInsecure());
    const media = new mediaPackage.MediaService(mediaTarget, credentials.createInsecure());
    const follow = new followPackage.FollowService(followTarget, credentials.createInsecure());
    const messaging = new messagingPackage.MessagingService(messagingTarget, credentials.createInsecure());
    const search = new searchPackage.SearchService(searchTarget, credentials.createInsecure());
    const notification = new notificationPackage.NotificationService(notificationTarget, credentials.createInsecure());
    const list = new listPackage.ListService(listTarget, credentials.createInsecure());
    const starterpack = new starterpackPackage.StarterpackService(starterpackTarget, credentials.createInsecure());
    const drafts = new draftsPackage.DraftsService(draftsTarget, credentials.createInsecure());
    // Optional services
    let videoFeed = undefined;
    try {
        const VideoFeedCtor = videoFeedPackage?.VideoFeedService || videoFeedPackage?.VideoFeedService || null;
        if (VideoFeedCtor)
            videoFeed = new VideoFeedCtor(process.env.VIDEO_FEED_GRPC_ADDR || 'video-feed-service:9090', credentials.createInsecure());
    }
    catch { }
    let analytics = undefined;
    try {
        const AnalyticsCtor = analyticsPackage?.AnalyticsService || null;
        if (AnalyticsCtor)
            analytics = new AnalyticsCtor(process.env.ANALYTICS_GRPC_ADDR || 'analytics-service:9097', credentials.createInsecure());
    }
    catch { }
    return { user, note, timeline, media, follow, messaging, search, notification, list, starterpack, drafts, videoFeed, analytics };
}

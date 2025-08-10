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
const userPkgDef = loadProto('services/user.proto');
const notePkgDef = loadProto('services/note_service.proto');
const timelinePkgDef = loadProto('services/timeline.proto');
const mediaPkgDef = loadProto('services/media.proto');
const followPkgDef = loadProto('src/services/follow_service/proto/follow_service.proto');
const messagingPkgDef = loadProto('services/messaging.proto');
const searchPkgDef = loadProto('services/search.proto');
const notificationPkgDef = loadProto('services/notification.proto');
export function createGrpcClients() {
    const userTarget = process.env.USER_GRPC_ADDR || 'user-service:9090';
    const noteTarget = process.env.NOTE_GRPC_ADDR || 'note-service:9090';
    const timelineTarget = process.env.TIMELINE_GRPC_ADDR || 'timeline-service:50051';
    const mediaTarget = process.env.MEDIA_GRPC_ADDR || 'media-service:9090';
    const followTarget = process.env.FOLLOW_GRPC_ADDR || 'follow-service:9090';
    const messagingTarget = process.env.MESSAGING_GRPC_ADDR || 'messaging-service:9090';
    const searchTarget = process.env.SEARCH_GRPC_ADDR || 'search-service:9096';
    const notificationTarget = process.env.NOTIFICATION_GRPC_ADDR || 'notification-service:9097';
    const userPackage = userPkgDef['sonet.user'];
    const notePackage = notePkgDef['sonet.note.grpc'];
    const timelinePackage = timelinePkgDef['sonet.timeline'];
    const mediaPackage = mediaPkgDef['sonet.media'];
    const followPackage = followPkgDef['sonet.follow.v1'];
    const messagingPackage = messagingPkgDef['sonet.messaging'];
    const searchPackage = searchPkgDef['sonet.search'];
    const notificationPackage = notificationPkgDef['sonet.notification'];
    const user = new userPackage.UserService(userTarget, credentials.createInsecure());
    const note = new notePackage.NoteService(noteTarget, credentials.createInsecure());
    const timeline = new timelinePackage.TimelineService(timelineTarget, credentials.createInsecure());
    const media = new mediaPackage.MediaService(mediaTarget, credentials.createInsecure());
    const follow = new followPackage.FollowService(followTarget, credentials.createInsecure());
    const messaging = new messagingPackage.MessagingService(messagingTarget, credentials.createInsecure());
    const search = new searchPackage.SearchService(searchTarget, credentials.createInsecure());
    const notification = new notificationPackage.NotificationService(notificationTarget, credentials.createInsecure());
    return { user, note, timeline, media, follow, messaging, search, notification };
}

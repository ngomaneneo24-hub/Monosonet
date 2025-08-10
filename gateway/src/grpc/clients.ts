import path from 'node:path';
import url from 'node:url';
import { loadPackageDefinition, credentials, Client } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROTO_DIR = process.env.PROTO_DIR || path.resolve(__dirname, '../../proto');

function loadProto(protoRelPath: string) {
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

export type GrpcClients = {
  user: any;
  note: any;
  timeline: any;
  media: any;
  follow: any;
  messaging: any;
};

export function createGrpcClients(): GrpcClients {
  const userTarget = process.env.USER_GRPC_ADDR || 'user-service:9090';
  const noteTarget = process.env.NOTE_GRPC_ADDR || 'note-service:9090';
  const timelineTarget = process.env.TIMELINE_GRPC_ADDR || 'timeline-service:50051';
  const mediaTarget = process.env.MEDIA_GRPC_ADDR || 'media-service:9090';
  const followTarget = process.env.FOLLOW_GRPC_ADDR || 'follow-service:9090';
  const messagingTarget = process.env.MESSAGING_GRPC_ADDR || 'messaging-service:9090';

  const userPackage: any = userPkgDef['sonet.user'];
  const notePackage: any = notePkgDef['sonet.note.grpc'];
  const timelinePackage: any = timelinePkgDef['sonet.timeline'];
  const mediaPackage: any = mediaPkgDef['sonet.media'];
  const followPackage: any = followPkgDef['sonet.follow.v1'];
  const messagingPackage: any = messagingPkgDef['sonet.messaging'];

  const user: Client = new userPackage.UserService(userTarget, credentials.createInsecure());
  const note: Client = new notePackage.NoteService(noteTarget, credentials.createInsecure());
  const timeline: Client = new timelinePackage.TimelineService(timelineTarget, credentials.createInsecure());
  const media: Client = new mediaPackage.MediaService(mediaTarget, credentials.createInsecure());
  const follow: Client = new followPackage.FollowService(followTarget, credentials.createInsecure());
  const messaging: Client = new messagingPackage.MessagingService(messagingTarget, credentials.createInsecure());

  return { user, note, timeline, media, follow, messaging };
}
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
export function createGrpcClients() {
    const userTarget = process.env.USER_GRPC_ADDR || 'user-service:9090';
    const noteTarget = process.env.NOTE_GRPC_ADDR || 'note-service:9090';
    const timelineTarget = process.env.TIMELINE_GRPC_ADDR || 'timeline-service:50051';
    const userPackage = userPkgDef['sonet.user'];
    const notePackage = notePkgDef['sonet.note.grpc'];
    const timelinePackage = timelinePkgDef['sonet.timeline'];
    const user = new userPackage.UserService(userTarget, credentials.createInsecure());
    const note = new notePackage.NoteService(noteTarget, credentials.createInsecure());
    const timeline = new timelinePackage.TimelineService(timelineTarget, credentials.createInsecure());
    return { user, note, timeline };
}

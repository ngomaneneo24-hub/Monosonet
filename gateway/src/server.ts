import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import http from 'http';
import { createGrpcClients } from './grpc/clients.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerNoteRoutes } from './routes/notes.js';
import { registerTimelineRoutes } from './routes/timeline.js';
import { registerFeedRoutes } from './routes/feeds.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerFollowRoutes } from './routes/follow.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerMessagingRoutes } from './routes/messaging.js';
import { registerNotificationRoutes } from './routes/notifications.js';
import { registerListRoutes } from './routes/lists.js';
import { registerStarterpackRoutes } from './routes/starterpacks.js';
import { registerDraftRoutes } from './routes/drafts.js';
import { registerMessageWebsocket } from './ws/messages.js';

// Load environment variables from .env (if present)
dotenv.config();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

const router = express.Router();
const clients = createGrpcClients();

registerAuthRoutes(router, clients);
registerUserRoutes(router, clients);
registerNoteRoutes(router, clients);
registerTimelineRoutes(router, clients);
registerFeedRoutes(router, clients);
registerMediaRoutes(router);
registerFollowRoutes(router, clients);
registerSearchRoutes(router, clients);
registerMessagingRoutes(router, clients);
registerNotificationRoutes(router, clients);
registerListRoutes(router, clients);
registerStarterpackRoutes(router, clients);
registerDraftRoutes(router, clients);

app.use('/api', router);

const port = Number(process.env.PORT || 8080);
const server = http.createServer(app);

// Register WebSocket endpoints under the same HTTP server
registerMessageWebsocket(server, clients);

server.listen(port, () => {
  console.log(`Sonet REST Gateway listening on :${port}`);
});
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { createGrpcClients } from './grpc/clients.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerUserRoutes } from './routes/users.js';
import { registerNoteRoutes } from './routes/notes.js';
import { registerTimelineRoutes } from './routes/timeline.js';
import { registerMediaRoutes } from './routes/media.js';
import { registerFollowRoutes } from './routes/follow.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerMessagingRoutes } from './routes/messaging.js';
import { registerNotificationRoutes } from './routes/notifications.js';

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
registerMediaRoutes(router);
registerFollowRoutes(router, clients);
registerSearchRoutes(router, clients);
registerMessagingRoutes(router, clients);
registerNotificationRoutes(router, clients);

app.use('/api', router);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Sonet REST Gateway listening on :${port}`);
});
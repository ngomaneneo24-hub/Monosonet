function userIdFromAuth(req) {
    const auth = req.header('authorization') || req.header('Authorization');
    if (!auth)
        return undefined;
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    return (token && token.length > 0) ? 'user-from-token' : undefined;
}
export function registerVideoFeedRoutes(router, clients) {
    // Get video feed with ML ranking
    router.note('/v1/video-feed', async (req, res) => {
        try {
            const userId = userIdFromAuth(req);
            const request = req.body;
            // Add user ID from auth if not provided
            if (!request.user_id && userId) {
                request.user_id = userId;
            }
            // Add request context
            request.context = {
                ...request.context,
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.get('X-Session-ID'),
                device_type: req.get('X-Device-Type') || 'unknown',
                platform: req.get('X-Platform') || 'unknown',
                app_version: req.get('X-App-Version') || '1.0.0'
            };
            // Call gRPC service
            const response = await clients.videoFeed.getVideoFeed(request);
            res.json(response);
        }
        catch (error) {
            console.error('Video feed error:', error);
            res.status(500).json({
                error: 'Failed to get video feed',
                message: error.message
            });
        }
    });
    // Get personalized feed for specific user
    router.note('/v1/video-feed/personalized', async (req, res) => {
        try {
            const userId = userIdFromAuth(req);
            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required for personalized feed'
                });
            }
            const request = req.body;
            request.user_id = userId;
            // Call gRPC service
            const response = await clients.videoFeed.getPersonalizedFeed(request);
            res.json(response);
        }
        catch (error) {
            console.error('Personalized feed error:', error);
            res.status(500).json({
                error: 'Failed to get personalized feed',
                message: error.message
            });
        }
    });
    // Track user engagement events
    router.note('/v1/video-feed/engagement', async (req, res) => {
        try {
            const userId = userIdFromAuth(req);
            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required for engagement tracking'
                });
            }
            const event = req.body;
            event.user_id = userId;
            event.timestamp = new Date().toISOString();
            // Add request context
            event.request_context = {
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                session_id: req.get('X-Session-ID'),
                device_type: req.get('X-Device-Type') || 'unknown',
                platform: req.get('X-Platform') || 'unknown',
                app_version: req.get('X-App-Version') || '1.0.0'
            };
            // Call gRPC service
            const response = await clients.videoFeed.trackEngagement(event);
            res.json(response);
        }
        catch (error) {
            console.error('Engagement tracking error:', error);
            res.status(500).json({
                error: 'Failed to track engagement',
                message: error.message
            });
        }
    });
    // Get feed insights and analytics
    router.note('/v1/video-feed/insights', async (req, res) => {
        try {
            const userId = userIdFromAuth(req);
            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required for feed insights'
                });
            }
            const request = req.body;
            request.user_id = userId;
            // Call gRPC service
            const response = await clients.videoFeed.getFeedInsights(request);
            res.json(response);
        }
        catch (error) {
            console.error('Feed insights error:', error);
            res.status(500).json({
                error: 'Failed to get feed insights',
                message: error.message
            });
        }
    });
    // Get videos by creator
    router.get('/v1/video-feed/creator/:creatorId', async (req, res) => {
        try {
            const { creatorId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            // Create video feed request for creator's videos
            const request = {
                feed_type: 'discover',
                algorithm: 'recency',
                pagination: { limit, offset },
                creator_id: creatorId
            };
            // Call gRPC service
            const response = await clients.videoFeed.getVideoFeed(request);
            res.json(response);
        }
        catch (error) {
            console.error('Creator videos error:', error);
            res.status(500).json({
                error: 'Failed to get creator videos',
                message: error.message
            });
        }
    });
    // Search videos
    router.get('/v1/video-feed/search', async (req, res) => {
        try {
            const query = req.query.q;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            if (!query) {
                return res.status(400).json({
                    error: 'Search query is required'
                });
            }
            // Create video feed request for search
            const request = {
                feed_type: 'discover',
                algorithm: 'search',
                pagination: { limit, offset },
                search_query: query
            };
            // Call gRPC service
            const response = await clients.videoFeed.getVideoFeed(request);
            res.json(response);
        }
        catch (error) {
            console.error('Video search error:', error);
            res.status(500).json({
                error: 'Failed to search videos',
                message: error.message
            });
        }
    });
    // Get similar videos
    router.get('/v1/video-feed/similar/:videoId', async (req, res) => {
        try {
            const { videoId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            // Create video feed request for similar videos
            const request = {
                feed_type: 'discover',
                algorithm: 'similarity',
                pagination: { limit, offset: 0 },
                reference_video_id: videoId
            };
            // Call gRPC service
            const response = await clients.videoFeed.getVideoFeed(request);
            res.json(response);
        }
        catch (error) {
            console.error('Similar videos error:', error);
            res.status(500).json({
                error: 'Failed to get similar videos',
                message: error.message
            });
        }
    });
    // Get video analytics
    router.get('/v1/video-feed/analytics/:videoId', async (req, res) => {
        try {
            const { videoId } = req.params;
            const timeWindow = req.query.time_window || '30d';
            // Call gRPC service for analytics
            const response = await clients.videoFeed.getVideoAnalytics({
                video_id: videoId,
                time_window: timeWindow
            });
            res.json(response);
        }
        catch (error) {
            console.error('Video analytics error:', error);
            res.status(500).json({
                error: 'Failed to get video analytics',
                message: error.message
            });
        }
    });
    // Get video recommendations
    router.get('/v1/video-feed/recommendations/:userId', async (req, res) => {
        try {
            const { userId } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            // Verify user can access these recommendations
            const authUserId = userIdFromAuth(req);
            if (!authUserId || authUserId !== userId) {
                return res.status(403).json({
                    error: 'Access denied to user recommendations'
                });
            }
            // Call gRPC service for recommendations
            const response = await clients.videoFeed.getVideoRecommendations({
                user_id: userId,
                limit
            });
            res.json(response);
        }
        catch (error) {
            console.error('Video recommendations error:', error);
            res.status(500).json({
                error: 'Failed to get video recommendations',
                message: error.message
            });
        }
    });
    // Health check
    router.get('/v1/video-feed/health', async (req, res) => {
        try {
            // Call gRPC service health check
            const response = await clients.videoFeed.healthCheck({
                service: 'video_feed'
            });
            res.json(response);
        }
        catch (error) {
            console.error('Video feed health check error:', error);
            res.status(500).json({
                error: 'Video feed service unhealthy',
                message: error.message
            });
        }
    });
    // Get trending videos (convenience endpoint)
    router.get('/v1/video-feed/trending', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 20;
            const timeWindow = req.query.time_window || '24h';
            // Create trending video feed request
            const request = {
                feed_type: 'trending',
                algorithm: 'trending',
                pagination: { limit, offset: 0 },
                time_window: timeWindow
            };
            // Call gRPC service
            const response = await clients.videoFeed.getVideoFeed(request);
            res.json(response);
        }
        catch (error) {
            console.error('Trending videos error:', error);
            res.status(500).json({
                error: 'Failed to get trending videos',
                message: error.message
            });
        }
    });
    // Get videos by category (convenience endpoint)
    router.get('/v1/video-feed/category/:category', async (req, res) => {
        try {
            const { category } = req.params;
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            // Create category video feed request
            const request = {
                feed_type: 'discover',
                algorithm: 'recency',
                pagination: { limit, offset },
                categories: [category]
            };
            // Call gRPC service
            const response = await clients.videoFeed.getVideoFeed(request);
            res.json(response);
        }
        catch (error) {
            console.error('Category videos error:', error);
            res.status(500).json({
                error: 'Failed to get category videos',
                message: error.message
            });
        }
    });
    // Batch engagement tracking
    router.note('/v1/video-feed/engagement/batch', async (req, res) => {
        try {
            const userId = userIdFromAuth(req);
            if (!userId) {
                return res.status(401).json({
                    error: 'Authentication required for batch engagement tracking'
                });
            }
            const events = req.body.events || [];
            if (!Array.isArray(events) || events.length === 0) {
                return res.status(400).json({
                    error: 'Events array is required'
                });
            }
            // Process each engagement event
            const results = [];
            for (const event of events) {
                try {
                    event.user_id = userId;
                    event.timestamp = new Date().toISOString();
                    // Add request context
                    event.request_context = {
                        ip_address: req.ip,
                        user_agent: req.get('User-Agent'),
                        session_id: req.get('X-Session-ID'),
                        device_type: req.get('X-Device-Type') || 'unknown',
                        platform: req.get('X-Platform') || 'unknown',
                        app_version: req.get('X-App-Version') || '1.0.0'
                    };
                    // Call gRPC service
                    const response = await clients.videoFeed.trackEngagement(event);
                    results.push({ success: true, event_id: event.video_id, response });
                }
                catch (error) {
                    results.push({ success: false, event_id: event.video_id, error: error.message });
                }
            }
            res.json({
                total_events: events.length,
                successful_events: results.filter(r => r.success).length,
                failed_events: results.filter(r => !r.success).length,
                results
            });
        }
        catch (error) {
            console.error('Batch engagement error:', error);
            res.status(500).json({
                error: 'Failed to process batch engagement',
                message: error.message
            });
        }
    });
    // Get feed performance metrics
    router.get('/v1/video-feed/performance', async (req, res) => {
        try {
            const userId = userIdFromAuth(req);
            const timeWindow = req.query.time_window || '24h';
            // Get performance metrics from the service
            const metrics = await clients.videoFeed.getPerformanceMetrics({
                user_id: userId,
                time_window: timeWindow
            });
            res.json(metrics);
        }
        catch (error) {
            console.error('Performance metrics error:', error);
            res.status(500).json({
                error: 'Failed to get performance metrics',
                message: error.message
            });
        }
    });
}

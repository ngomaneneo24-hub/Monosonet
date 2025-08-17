function userIdFromAuth(req) {
    const auth = req.header('authorization') || req.header('Authorization');
    if (!auth)
        return undefined;
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    return (token && token.length > 0) ? 'user-from-token' : undefined;
}
export function registerFeedRoutes(router, clients) {
    // For You Feed - ML-powered personalized content
    router.get('/v1/feeds/for-you', (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        const userId = userIdFromAuth(req);
        if (!userId) {
            return res.status(401).json({
                ok: false,
                message: 'Authentication required for personalized feed'
            });
        }
        const request = {
            user_id: userId,
            algorithm: 'FOR_YOU_ML', // ML-powered algorithm
            pagination: { limit, cursor },
            include_ranking_signals: true, // Include ML ranking data
            real_time_updates: true,
            personalization: {
                user_interests: req.query.interests?.toString().split(',') || [],
                content_preferences: req.query.preferences?.toString().split(',') || [],
                engagement_history: req.query.engagement === 'true'
            }
        };
        clients.timeline.GetForYouFeed(request, (err, resp) => {
            if (err) {
                console.error('For You feed error:', err);
                return res.status(500).json({
                    ok: false,
                    message: 'Failed to generate personalized feed',
                    error: err.message
                });
            }
            // Transform response for client consumption
            const feedItems = (resp?.items || []).map((item) => ({
                note: item.note,
                ranking: {
                    score: item.ml_score,
                    factors: item.ranking_factors,
                    personalization: item.personalization_reasons
                },
                feedContext: 'for-you',
                cursor: item.cursor
            }));
            return res.json({
                ok: resp?.success ?? true,
                items: feedItems,
                pagination: resp?.pagination,
                personalization: {
                    algorithm: 'FOR_YOU_ML',
                    version: resp?.algorithm_version || '1.0',
                    factors: resp?.personalization_summary
                }
            });
        });
    });
    // Video Feed - Enhanced with ML ranking
    router.get('/v1/feeds/video', (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        const userId = userIdFromAuth(req);
        const request = {
            user_id: userId || '',
            algorithm: 'VIDEO_ML', // Video-specific ML algorithm
            pagination: { limit, cursor },
            include_ranking_signals: true,
            real_time_updates: true,
            content_filters: {
                media_type: 'video',
                min_duration: Number(req.query.min_duration || 0),
                max_duration: Number(req.query.max_duration || 180000), // 3 minutes
                quality_preference: req.query.quality || 'auto'
            }
        };
        clients.timeline.GetVideoFeed(request, (err, resp) => {
            if (err) {
                console.error('Video feed error:', err);
                return res.status(500).json({
                    ok: false,
                    message: 'Failed to generate video feed',
                    error: err.message
                });
            }
            const videoItems = (resp?.items || []).map((item) => ({
                note: item.note,
                video: {
                    duration: item.video_duration,
                    quality: item.video_quality,
                    thumbnail: item.video_thumbnail,
                    playback_url: item.video_playback_url
                },
                ranking: {
                    score: item.ml_score,
                    factors: item.ranking_factors
                },
                feedContext: 'video',
                cursor: item.cursor
            }));
            return res.json({
                ok: resp?.success ?? true,
                items: videoItems,
                pagination: resp?.pagination,
                video_stats: {
                    total_videos: resp?.total_count,
                    average_duration: resp?.average_duration,
                    quality_distribution: resp?.quality_distribution
                }
            });
        });
    });
    // Following Feed - Simple chronological timeline
    router.get('/v1/feeds/following', (req, res) => {
        const limit = Number(req.query.limit || 20);
        const cursor = String(req.query.cursor || '');
        const userId = userIdFromAuth(req);
        if (!userId) {
            return res.status(401).json({
                ok: false,
                message: 'Authentication required for following feed'
            });
        }
        const request = {
            user_id: userId,
            algorithm: 'FOLLOWING_CHRONOLOGICAL', // Simple chronological
            pagination: { limit, cursor },
            include_ranking_signals: false, // No ML ranking for following
            real_time_updates: true
        };
        clients.timeline.GetFollowingFeed(request, (err, resp) => {
            if (err) {
                console.error('Following feed error:', err);
                return res.status(500).json({
                    ok: false,
                    message: 'Failed to generate following feed',
                    error: err.message
                });
            }
            const followingItems = (resp?.items || []).map((item) => ({
                note: item.note,
                feedContext: 'following',
                cursor: item.cursor
            }));
            return res.json({
                ok: resp?.success ?? true,
                items: followingItems,
                pagination: resp?.pagination
            });
        });
    });
    // Feed Interaction Tracking - For ML training
    router.note('/v1/feeds/interactions', (req, res) => {
        const userId = userIdFromAuth(req);
        const { interactions } = req.body;
        if (!userId) {
            return res.status(401).json({
                ok: false,
                message: 'Authentication required'
            });
        }
        if (!interactions || !Array.isArray(interactions)) {
            return res.status(400).json({
                ok: false,
                message: 'Invalid interactions data'
            });
        }
        // Send interactions to ML training pipeline
        const request = {
            user_id: userId,
            interactions: interactions.map((interaction) => ({
                note_id: interaction.item,
                event_type: interaction.event,
                feed_context: interaction.feedContext,
                timestamp: new Date().toISOString(),
                metadata: {
                    session_id: req.headers['x-session-id'],
                    client_version: req.headers['x-client-version'],
                    platform: req.headers['x-platform']
                }
            }))
        };
        clients.analytics.TrackFeedInteractions(request, (err, resp) => {
            if (err) {
                console.error('Failed to track interactions:', err);
                // Don't fail the request, just log the error
                return res.json({
                    ok: true,
                    message: 'Interactions received (tracking may be delayed)'
                });
            }
            return res.json({
                ok: true,
                message: 'Interactions tracked successfully',
                tracking_id: resp?.tracking_id
            });
        });
    });
    // Feed Personalization Settings
    router.get('/v1/feeds/personalization/:userId', (req, res) => {
        const userId = req.params.userId;
        const requestingUserId = userIdFromAuth(req);
        if (!requestingUserId || requestingUserId !== userId) {
            return res.status(403).json({
                ok: false,
                message: 'Access denied'
            });
        }
        // Get user's personalization preferences and ML model data
        const request = {
            user_id: userId,
            include_model_data: true,
            include_preferences: true
        };
        clients.timeline.GetUserPersonalization(request, (err, resp) => {
            if (err) {
                console.error('Personalization error:', err);
                return res.status(500).json({
                    ok: false,
                    message: 'Failed to get personalization data',
                    error: err.message
                });
            }
            return res.json({
                ok: true,
                personalization: {
                    interests: resp?.interests || [],
                    content_preferences: resp?.content_preferences || {},
                    ml_model_version: resp?.model_version,
                    last_updated: resp?.last_updated,
                    engagement_patterns: resp?.engagement_patterns || {}
                }
            });
        });
    });
}

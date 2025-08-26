import {makeRequest} from '#/lib/api/request'
import {logger} from '#/logger'

export interface OverdriveRankingRequest {
	user_id: string
	candidate_items: Array<{
		id: string
		content: string
		hashtags: string[]
		media_types: string[]
		engagement_rate: number
		quality_score: number
		freshness_score: number
		author_followers: number
		[key: string]: any
	}>
	limit: number
}

export interface OverdriveRankingResponse {
	user_id: string
	rankings: Array<{
		note_id: string
		score: number
		factors: Record<string, number>
		reasons: string[]
	}>
	total_items: number
	ranking_method: string
}

export interface UserInsights {
	user_features?: Record<string, any>
	interests?: string[]
	interest_diversity?: number
	cold_start_active?: boolean
	cold_start_boost?: number
	ranking_method?: string
}

export class OverdriveAPI {
	private baseUrl: string

	constructor(baseUrl: string = 'http://localhost:8088') {
		this.baseUrl = baseUrl
	}

	/**
	 * Overdrive is always enabled - no user toggle needed
	 * This matches TikTok's approach where ML is always active
	 */
	isOverdriveEnabled(): boolean {
		return true // Always enabled
	}

	/**
	 * Get the Overdrive header value for API requests
	 */
	getOverdriveHeader(): string | null {
		return '1' // Always return '1' - Overdrive is always on
	}

	/**
	 * Rank items using Overdrive ML service
	 */
	async rankForYou(
		request: OverdriveRankingRequest,
		authToken?: string
	): Promise<OverdriveRankingResponse> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		}

		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`
		}

		try {
			const response = await makeRequest(`${this.baseUrl}/rank/for-you`, {
				method: 'POST',
				headers,
				body: JSON.stringify(request),
			})

			return response as OverdriveRankingResponse
		} catch (e) {
			logger.error('Overdrive ranking failed:', e)
			throw new Error('Failed to get Overdrive rankings')
		}
	}

	/**
	 * Get user insights from Overdrive
	 */
	async getUserInsights(
		userId: string,
		authToken?: string
	): Promise<UserInsights> {
		const headers: Record<string, string> = {}

		if (authToken) {
			headers['Authorization'] = `Bearer ${authToken}`
		}

		try {
			const response = await makeRequest(`${this.baseUrl}/insights/${userId}`, {
				method: 'GET',
				headers,
			})

			return response.insights as UserInsights
		} catch (e) {
			logger.error('Failed to get user insights:', e)
			throw new Error('Failed to get user insights')
		}
	}

	/**
	 * Get user interests from Overdrive
	 */
	async getUserInterests(
		userId: string,
		authToken: string
	): Promise<string[]> {
		try {
			const response = await makeRequest(`${this.baseUrl}/interests/${userId}`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${authToken}`,
				},
			})

			return response.interests as string[]
		} catch (e) {
			logger.error('Failed to get user interests:', e)
			throw new Error('Failed to get user interests')
		}
	}

	/**
	 * Check Overdrive service health
	 */
	async checkHealth(): Promise<boolean> {
		try {
			const response = await makeRequest(`${this.baseUrl}/health`, {
				method: 'GET',
			})

			return response.status === 'ok'
		} catch (e) {
			logger.error('Overdrive health check failed:', e)
			return false
		}
	}
}

// Global instance
export const overdriveAPI = new OverdriveAPI()

// Export for use in other modules
export default overdriveAPI
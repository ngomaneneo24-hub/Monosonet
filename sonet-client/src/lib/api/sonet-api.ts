// Sonet API Module - Comprehensive exports for the codebase

// Core shim types and guards used by the app. These are intentionally
// lightweight to keep the migration unblocked.

export namespace SonetFeedNote {
	export type Record = any
	export function isRecord(v: unknown): v is Record {
		return !!v
	}
}

export namespace SonetFeedThreadgate {
	export type Record = any
	export function isRecord(v: unknown): v is Record {
		return !!v
	}
}

export namespace SonetEmbedRecord {
	export type View = any
	export type ViewRecord = any
	export type ViewDetached = any
	export type Main = any
	export function isView(_: unknown): _ is View { return true }
	export function isViewRecord(_: unknown): _ is ViewRecord { return true }
	export function isViewDetached(_: unknown): _ is ViewDetached { return true }
}

export namespace SonetEmbedRecordWithMedia {
	export type View = any
	export type ViewRecord = any
	export type Main = any
	export function isView(_: unknown): _ is View { return true }
}

export namespace SonetEmbedImages {
	export type View = any
	export type Image = any
	export type Main = any
	export function isView(_: unknown): _ is View { return true }
}

export namespace SonetEmbedVideo {
	export type View = any
	export type Main = any
	export function isView(_: unknown): _ is View { return true }
}

export namespace SonetFeedDefs {
	export type NoteView = any
	export function isNoteView(_: unknown): _ is NoteView { return true }
}

export namespace SonetGraphDefs {
	export type ListView = any
	export type ListViewBasic = any
	export type StarterPackView = any
	export type StarterPackViewBasic = any
	export const CURATELIST = 'curatelist' as const
}

export namespace SonetGraphStarterpack {
	export type Record = any
	export function isRecord(v: unknown): v is Record { return !!v }
}

export namespace SonetActorDefs {
	export type ProfileViewBasic = any
}

export namespace SonetUnspeccedDefs {
	export type ThreadItemNote = any
	export type ThreadItemNotFound = any
	export type ThreadItemBlocked = any
	export type ThreadItemNoUnauthenticated = any

	export function isThreadItemNote(v: unknown): v is ThreadItemNote {
		return !!v && typeof v === 'object' && 'note' in (v as any)
	}
	export function isThreadItemNotFound(v: unknown): v is ThreadItemNotFound {
		return !!v && (v as any).reason === 'not-found'
	}
	export function isThreadItemBlocked(v: unknown): v is ThreadItemBlocked {
		return !!v && (v as any).reason === 'blocked'
	}
	export function isThreadItemNoUnauthenticated(v: unknown): v is ThreadItemNoUnauthenticated {
		return !!v && (v as any).reason === 'no-unauthenticated'
	}
}

export namespace SonetUnspeccedGetNoteThreadV2 {
	export type ThreadItem = any
	export type OutputSchema = any
}

export namespace SonetRepoUploadBlob {
	export type Response = {
		success: boolean
		headers: Headers
		data: { blob: BlobRef }
	}
}

export namespace SonetRichtextFacet {
	export type Main = any
}

export namespace SonetLabelDefs {
	export type SelfLabels = { type: 'sonet'; values: {val: string}[] }
}

export namespace SonetServerDefs {
	export type AppPassword = any
}

export namespace SonetNotificationDefs {
	export type Settings = any
	export type ActivitySubscription = { note: boolean; reply: boolean }
}

export namespace SonetRepoPutRecord {
	export class InvalidSwapError extends Error {}
}

export type ModerationOpts = { userDid: string }

export function moderateNote(_: any, __: ModerationOpts) {
	return {
		ui: (_context: string) => ({
			blur: false,
			filter: false,
			blurs: [],
			filters: [],
		}),
	}
}

// Simple mute-word helper used by a few queries
export function hasMutedWord({
	mutedWords = [],
	text = '',
	facets,
	outlineTags,
	languages,
	actor,
}: {
	mutedWords?: Array<{word: string} | string>
	text?: string
	facets?: unknown
	outlineTags?: string[]
	languages?: string[]
	actor?: unknown
}): boolean {
	const words = (mutedWords || []).map(w =>
		typeof w === 'string' ? w.toLowerCase() : String((w as any).word || '').toLowerCase(),
	)
	const hay = (text || '').toLowerCase()
	return words.some(w => w && hay.includes(w))
}

export class AtUri {
	href: string
	host: string
	rkey: string

	constructor(uri: string) {
		this.href = uri || ''
		try {
			const u = new URL(uri.replace(/^at:\/\//, 'https://').replace(/^sonet:\/\//, 'https://'))
			this.host = u.hostname || ''
			const parts = u.pathname.split('/').filter(Boolean)
			this.rkey = parts.at(-1) || ''
		} catch {
			const m = /^(?:[a-z]+:\/\/)?([^/]+).*\/([^/]+)$/.exec(uri || '')
			this.host = m?.[1] || ''
			this.rkey = m?.[2] || ''
		}
	}
	static make(host: string, nsid: string, rkey?: string) {
		const path = rkey ? `${nsid}/${rkey}` : nsid
		return new AtUri(`sonet://${host}/${path}`)
	}
	toString() {
		return this.href || `sonet://${this.host}/${this.rkey ? this.rkey : ''}`
	}
}

export class BlobRef {
	constructor(public ref: string, public mimeType: string, public size: number) {}
	ipld() {
		return { $link: this.ref }
	}
}

export class RichText {
	text: string
	facets?: any[]
	constructor(opts: {text: string; facets?: any[]}, _cfg?: {cleanNewlines?: boolean}) {
		this.text = opts.text
		this.facets = opts.facets
	}
	async detectFacets(_agent: any) {}
	detectFacetsWithoutResolution() {}
}

export class TID {
	private value: bigint
	private constructor(value: bigint) { this.value = value }
	static next(prev?: TID): TID {
		const now = BigInt(Date.now())
		const inc = prev ? prev.value + 1n : 0n
		return new TID((now << 8n) | (inc & 0xffn))
	}
	static nextStr(): string { return TID.next().toString() }
	static fromStr(s: string): TID { return new TID(BigInt(s)) }
	timestamp(): number { return Number(this.value >> 8n) }
	toString(): string { return this.value.toString() }
}

// Re-export SonetClient and helpers for convenience
export { SonetClient, sonetClient } from '../../api/sonet-client'
export * from '../../types/sonet'

export type $Typed<T> = T
export type Un$Typed<T> = T

export namespace SonetRepoApplyWrites {
	export type Create = any
	export type Update = any
	export type Delete = { type: 'sonet'; collection: string; rkey: string }
}

export namespace SonetActorStatus {
	export type Record = {
		createdAt: string
		durationMinutes: number
		status: string
		embed?: any
	}
	export function isRecord(v: unknown): v is Record {
		return !!v && typeof v === 'object' && 'status' in (v as any)
	}
	export function validateRecord(v: unknown): {success: boolean; value?: Record} {
		return isRecord(v) ? {success: true, value: v} : {success: false}
	}
}
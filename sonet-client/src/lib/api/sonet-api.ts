// Sonet API Module - Comprehensive exports for the codebase

// Core types
export interface SonetEmbedRecord {
  View: any
  ViewRecord: any
  ViewDetached: any
  Main: any
  isView: (obj: any) => boolean
  isViewRecord: (obj: any) => boolean
  isViewDetached: (obj: any) => boolean
}

export interface SonetEmbedRecordWithMedia {
  View: any
  ViewRecord: any
  Main: any
  isView: (obj: any) => boolean
}

export interface SonetFeedNote {
  Record: any
  isRecord: (obj: any) => boolean
}

export interface SonetFeedDefs {
  NoteView: any
}

export interface SonetActorDefs {
  ProfileViewBasic: any
}

export interface SonetUnspeccedDefs {
  ThreadItemNote: any
  ThreadItemNoUnauthenticated: any
  ThreadItemNotFound: any
  ThreadItemBlocked: any
}

export interface SonetUnspeccedGetNoteThreadV2 {
  ThreadItem: any
}

export interface SonetEmbedExternal {
  View: any
  isView: (obj: any) => boolean
}

export interface SonetEmbedImages {
  View: any
  isView: (obj: any) => boolean
}

export interface SonetEmbedVideo {
  View: any
  isView: (obj: any) => boolean
}

export interface SonetAppAgent {
  assertDid: string
}

export interface SonetLabelDefs {
  // Add label definitions as needed
}

export interface SonetRepoApplyWrites {
  Create: any
}

export interface SonetRenoTerongRef {
  // Add reno terong ref definitions as needed
}

export interface ModerationOpts {
  userDid: string
  // Add other moderation options as needed
}

export interface AtUri {
  href: string
  host: string
  rkey: string
}

export interface BlobRef {
  // Add blob ref definitions as needed
}

export interface RichText {
  text: string
  // Add other rich text properties as needed
}

export interface TID {
  // Add TID definitions as needed
}

// Utility type for typed objects
export type $Typed<T> = T

// Moderation function
export function moderateNote(note: any, moderationOpts: ModerationOpts) {
  // Implement proper moderation logic
  return {
    ui: (context: string) => ({
      blur: false,
      filter: false,
      blurs: [],
      filters: [],
    }),
  }
}

// Export the SonetClient as default
export { SonetClient as default } from '../api/sonet-client'
export { SonetClient as sonetClient } from '../api/sonet-client'

// Re-export all types
export * from '../types/sonet'
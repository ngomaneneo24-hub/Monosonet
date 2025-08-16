// Shim for missing @sonet/types package
// This is referenced in the codebase but doesn't exist

export const TID = {
  next: () => Math.random().toString(36).substring(2, 15),
}
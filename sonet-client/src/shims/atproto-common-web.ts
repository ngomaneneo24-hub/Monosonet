export const TID = {
  isValid(_v: unknown): boolean { return true },
  nextStr(): string { return '' },
  fromStr(_v: string): string { return _v },
}
export async function setStringAsync(text: string) {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch {
		return false
	}
}

export function getStringAsync(): Promise<string> {
	return navigator.clipboard.readText()
}

export const isAvailableAsync = async () => true

// Provide a placeholder component name expected by compiled code
export const ExpoClipboardPasteButton: any = function ExpoClipboardPasteButton() {
	return null
}
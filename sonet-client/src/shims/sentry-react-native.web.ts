export const init = (_opts?: any) => {}
export const captureException = (_e: any, _ctx?: any) => {}
export const captureMessage = (_m: string, _level?: any) => {}
export const withScope = (fn: (scope: any) => void) => fn({ setContext() {}, setTag() {}, setUser() {} })
export const addBreadcrumb = (_b: any) => {}
export const ReactNativeTracing = {}
export default { init, captureException, captureMessage, withScope, addBreadcrumb, ReactNativeTracing }
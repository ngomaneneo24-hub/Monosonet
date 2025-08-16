// Shim for missing zeego/lib/typescript/menu types
// This provides the MenuItemCommonProps interface that's referenced in the codebase

export interface MenuItemCommonProps {
  disabled?: boolean
  onSelect?: () => void
  children?: React.ReactNode
  style?: any
  [key: string]: any
}
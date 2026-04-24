export type IndexCardRow =
  | {
      type: 'text'
      text: string
      size?: 'auto' | 'normal' | 'small'
      subtext?: string
    }
  | {
      type: 'divider'
    }

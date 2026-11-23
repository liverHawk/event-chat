import { ADMIN_CSS } from './styles/admin'
import { BASE_CSS } from './styles/base'
import { CHAT_CSS } from './styles/chat'
import { PICKER_AND_RESPONSIVE_CSS } from './styles/picker'

export const APP_CSS = [BASE_CSS, CHAT_CSS, ADMIN_CSS, PICKER_AND_RESPONSIVE_CSS].join('\n')

const hashCss = (input: string): string => {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}

export const APP_CSS_VERSION = hashCss(APP_CSS)

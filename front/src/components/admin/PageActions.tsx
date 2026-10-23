import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** The header element that holds the current page's primary actions. */
export const PageActionsSlot = createContext<HTMLElement | null>(null)

/** Renders a page's primary actions in the admin header, beside the page title. */
export function PageActions({ children }: { children: ReactNode }) {
  const slot = useContext(PageActionsSlot)
  return slot ? createPortal(children, slot) : null
}

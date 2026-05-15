import type { ReactNode } from 'react'

type LucideIconProps = {
  name: string
  children: ReactNode
}

export function LucideIcon({ name, children }: LucideIconProps) {
  return (
    <svg
      aria-hidden="true"
      data-icon={`lucide-${name}`}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  )
}

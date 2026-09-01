import type { ReactNode } from 'react'

type LucideIconProps = {
  name: string
  children: ReactNode
  className?: string
}

export function LucideIcon({ name, children, className }: LucideIconProps) {
  return (
    <svg
      aria-hidden="true"
      data-icon={`lucide-${name}`}
      className={className}
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

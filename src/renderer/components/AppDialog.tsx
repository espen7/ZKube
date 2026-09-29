import { Dialog } from '@mui/material'
import type { ReactNode } from 'react'

type AppDialogProps = {
  open: boolean
  ariaLabel: string
  onClose?: (event: object, reason: 'backdropClick' | 'escapeKeyDown') => void
  paperClassName?: string
  children: ReactNode
}

export function AppDialog({
  open,
  ariaLabel,
  onClose,
  paperClassName,
  children,
}: AppDialogProps) {
  return (
    <Dialog
      maxWidth={false}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: ['dialog', paperClassName].filter(Boolean).join(' '),
          'aria-label': ariaLabel,
        },
      }}
    >
      {children}
    </Dialog>
  )
}

type MaterialSymbolProps = {
  name: string
  size?: number
  className?: string
}

export function MaterialSymbol({ name, size = 16, className }: MaterialSymbolProps) {
  return (
    <span
      aria-hidden="true"
      className={['material-symbols-rounded', className].filter(Boolean).join(' ')}
      data-icon={`sym-${name}`}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}

interface SectionMetaProps {
  index: string
  label: string
  title?: string
  description?: string
  align?: 'left' | 'center'
}

export function SectionMeta({ index, label, title, description, align = 'left' }: SectionMetaProps) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      <div
        className={`lp-mono flex items-center gap-3 text-[10px] tracking-[0.3em] uppercase ${
          align === 'center' ? 'justify-center' : ''
        }`}
        style={{ color: 'var(--lp-muted)' }}
      >
        <span>{index}</span>
        <span className="h-px w-8" style={{ background: 'var(--lp-line)' }} />
        <span>{label}</span>
      </div>

      {title && (
        <h2 className="mt-5 text-[clamp(1.9rem,4.4vw,3.4rem)] font-semibold leading-[1.06] tracking-[-0.03em]">
          {title}
        </h2>
      )}

      {description && (
        <p
          className={`mt-4 max-w-md text-sm leading-relaxed ${align === 'center' ? 'mx-auto' : ''}`}
          style={{ color: 'var(--lp-muted)' }}
        >
          {description}
        </p>
      )}
    </div>
  )
}

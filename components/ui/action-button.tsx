import Link from 'next/link'
import type { ElementType } from 'react'

const VARIANT_CLASSES = {
  view: 'hover:text-blue-600 hover:bg-blue-50',
  edit: 'hover:text-amber-600 hover:bg-amber-50',
  delete: 'hover:text-red-600 hover:bg-red-50',
  custom: '',
}

const BASE = 'flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 transition-colors'

type BaseProps = {
  variant?: keyof typeof VARIANT_CLASSES
  icon: ElementType
  title?: string
  disabled?: boolean
  className?: string
}

type AsLink = BaseProps & { href: string; onClick?: never }
type AsButton = BaseProps & { onClick: () => void; href?: never }
type ActionButtonProps = AsLink | AsButton

export default function ActionButton({
  variant = 'view',
  icon: Icon,
  title,
  disabled,
  className = '',
  ...rest
}: ActionButtonProps) {
  const colorClass = VARIANT_CLASSES[variant]
  const cls = `${BASE} ${colorClass} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`

  if ('href' in rest && rest.href) {
    return (
      <Link href={rest.href} className={cls} title={title}>
        <Icon size={15} />
      </Link>
    )
  }

  return (
    <button
      onClick={(rest as AsButton).onClick}
      disabled={disabled}
      className={cls}
      title={title}
    >
      <Icon size={15} />
    </button>
  )
}

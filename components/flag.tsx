'use client'

import 'react-flagpack/dist/style.css'

interface FlagProps {
  code: string
  size?: 's' | 'm' | 'l'
  gradient?: string
  hasBorder?: boolean
  hasDropShadow?: boolean
  hasBorderRadius?: boolean
  className?: string
}

export function Flag({
  code = 'NL',
  size = 'l',
  gradient = '',
  hasBorder = true,
  hasDropShadow = false,
  hasBorderRadius = true,
  className = '',
}: FlagProps) {
  return (
    <div
      className={`flag ${gradient} size-${size} ${hasBorder ? 'border' : ''} ${hasDropShadow ? 'drop-shadow' : ''} ${hasBorderRadius ? 'border-radius' : ''} ${className}`.trim()}
    >
      <img src={`/app/flags/${size}/${code}.svg`} alt={code} />
    </div>
  )
}

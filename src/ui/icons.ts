// The single icon map: ui components never import lucide-react directly.
import { Check, ChevronRight, Eye, EyeOff, Pencil } from 'lucide-react'

export const icons = {
  eye: Eye,
  eyeOff: EyeOff,
  check: Check,
  chevronRight: ChevronRight,
  pencil: Pencil,
} as const

export type IconName = keyof typeof icons

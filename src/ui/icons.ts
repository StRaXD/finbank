// The single icon map: ui components never import lucide-react directly.
import {
  ArrowLeftRight,
  BanknoteArrowUp,
  Bell,
  Check,
  ChevronRight,
  ChevronsRight,
  Crosshair,
  EllipsisVertical,
  Eye,
  EyeOff,
  LayoutGrid,
  LogIn,
  Pencil,
  Receipt,
  Search,
  Settings,
  Wallet,
  X,
} from 'lucide-react'

export const icons = {
  eye: Eye,
  eyeOff: EyeOff,
  check: Check,
  chevronRight: ChevronRight,
  chevronsRight: ChevronsRight,
  pencil: Pencil,
  // Shell navigation (closest lucide matches to the 104–111 PNG glyphs).
  overview: LayoutGrid,
  balances: Wallet,
  transactions: ArrowLeftRight,
  bills: Receipt,
  expenses: BanknoteArrowUp,
  goals: Crosshair,
  settings: Settings,
  // The PNG's Logout glyph is an arrow entering a bracket, which is lucide's LogIn shape.
  logout: LogIn,
  bell: Bell,
  search: Search,
  kebab: EllipsisVertical,
  // Modal close (110.2. Goals.png).
  close: X,
} as const

export type IconName = keyof typeof icons

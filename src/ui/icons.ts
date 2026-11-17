// The single icon map: ui components never import lucide-react directly.
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  Banknote,
  BanknoteArrowUp,
  Bell,
  CarTaxiFront,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Circle,
  Clapperboard,
  Crosshair,
  EllipsisVertical,
  Eye,
  EyeOff,
  Gamepad2,
  House,
  LayoutGrid,
  LogIn,
  Pencil,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Utensils,
  Wallet,
  X,
} from 'lucide-react'
import type { ExpenseCategoryId, TransactionIcon } from '../api/types.ts'

export const icons = {
  eye: Eye,
  eyeOff: EyeOff,
  check: Check,
  chevronDown: ChevronDown,
  chevronLeft: ChevronLeft,
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
  // The carousel slide's open-details button (104. Overview.png).
  arrowUpRight: ArrowUpRight,
  // Trend direction (109. Expenses.png): red up for an increase, green down for a decrease.
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  // An Overview Expenses Breakdown tile's link to Expenses (104. Overview.png).
  arrowRight: ArrowRight,
} as const

export type IconName = keyof typeof icons

/** Transaction item glyphs (closest lucide matches to 107. Transactions.png). */
export const transactionIcons: Record<TransactionIcon, LucideIcon> = {
  gadget: Gamepad2,
  shopping: ShoppingBag,
  food: Utensils,
  entertainment: Clapperboard,
  transport: CarTaxiFront,
  housing: House,
  salary: Banknote,
  transfer: ArrowLeftRight,
  other: Circle,
}

/** Expense category glyphs (closest lucide matches to 109. Expenses.png). */
export const categoryIcons: Record<ExpenseCategoryId, LucideIcon> = {
  housing: House,
  food: Utensils,
  transportation: CarTaxiFront,
  entertainment: Clapperboard,
  shopping: ShoppingBag,
  others: LayoutGrid,
}

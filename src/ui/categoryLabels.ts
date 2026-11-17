// CategoryIcon's label map, kept in its own module so CategoryIcon.tsx exports only components
// (fast refresh).
import type { ExpenseCategoryId } from '../api/types.ts'

/** Display names of the six expense categories. */
export const categoryLabels: Record<ExpenseCategoryId, string> = {
  housing: 'Housing',
  food: 'Food',
  transportation: 'Transportation',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  others: 'Others',
}

/**
 * Order status management and state transitions.
 * Complies with AGENT_SPEC.md Assumption A-05:
 * new → paid → processing → shipped → completed
 * cancelled allowed from new, paid, processing.
 */

export type OrderStatus =
  | "new"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  paid: "Оплачен",
  processing: "В обработке",
  shipped: "Доставляется",
  completed: "Завершен",
  cancelled: "Отменен",
};

export const ORDER_STATUS_VARIANTS: Record<OrderStatus, {
  label: string;
  badgeClass: string;
  bgClass: string;
  textClass: string;
}> = {
  new: {
    label: "Новый",
    badgeClass: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    textClass: "text-blue-700 dark:text-blue-400",
  },
  paid: {
    label: "Оплачен",
    badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  processing: {
    label: "В обработке",
    badgeClass: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  shipped: {
    label: "Доставляется",
    badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
    textClass: "text-purple-700 dark:text-purple-400",
  },
  completed: {
    label: "Завершен",
    badgeClass: "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border-emerald-600/30",
    bgClass: "bg-emerald-100 dark:bg-emerald-900/30",
    textClass: "text-emerald-800 dark:text-emerald-300",
  },
  cancelled: {
    label: "Отменен",
    badgeClass: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    bgClass: "bg-rose-50 dark:bg-rose-950/30",
    textClass: "text-rose-700 dark:text-rose-400",
  },
};

/**
 * Valid allowed status transitions according to A-05
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["paid", "processing", "cancelled"],
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["completed"],
  completed: [],
  cancelled: [],
};

/**
 * Checks if transitioning from one status to another is valid
 */
export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

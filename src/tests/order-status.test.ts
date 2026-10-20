import { describe, it, expect } from "vitest";
import {
  OrderStatus,
  ALL_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_VARIANTS,
  canTransitionOrder,
  validateStatusTransition,
  getAllowedNextStatuses,
  isCancelableStatus,
  isTerminalStatus,
} from "@/lib/order-status";
import { ConflictError } from "@/lib/errors";

describe("Order Status Transition Matrix (A-05 / T10)", () => {
  describe("1. Complete Transition Matrix Verification (36 Pairs)", () => {
    // Explicit expected allowed transitions:
    const expectedAllowed: Record<OrderStatus, OrderStatus[]> = {
      new: ["paid", "processing", "cancelled"],
      paid: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["completed"],
      completed: [],
      cancelled: [],
    };

    ALL_ORDER_STATUSES.forEach((fromStatus) => {
      ALL_ORDER_STATUSES.forEach((toStatus) => {
        if (fromStatus === toStatus) {
          it(`allows self-transition: ${fromStatus} -> ${toStatus}`, () => {
            expect(canTransitionOrder(fromStatus, toStatus)).toBe(true);
            expect(() =>
              validateStatusTransition(fromStatus, toStatus)
            ).not.toThrow();
          });
          return;
        }

        const isAllowed = expectedAllowed[fromStatus].includes(toStatus);

        if (isAllowed) {
          it(`ALLOWS valid transition: ${fromStatus} -> ${toStatus}`, () => {
            expect(canTransitionOrder(fromStatus, toStatus)).toBe(true);
            expect(() =>
              validateStatusTransition(fromStatus, toStatus)
            ).not.toThrow();
          });
        } else {
          it(`FORBIDS invalid transition: ${fromStatus} -> ${toStatus}`, () => {
            expect(canTransitionOrder(fromStatus, toStatus)).toBe(false);
            expect(() =>
              validateStatusTransition(fromStatus, toStatus)
            ).toThrow(ConflictError);

            try {
              validateStatusTransition(fromStatus, toStatus);
            } catch (err) {
              expect(err).toBeInstanceOf(ConflictError);
              expect((err as ConflictError).statusCode).toBe(409);
              expect((err as ConflictError).code).toBe(
                "INVALID_STATUS_TRANSITION"
              );
              expect((err as ConflictError).message).toContain(
                "Недопустимый переход статуса"
              );
            }
          });
        }
      });
    });
  });

  describe("2. Specific Business Scenarios (A-05)", () => {
    it("happy path for online payment: new -> paid -> processing -> shipped -> completed", () => {
      expect(canTransitionOrder("new", "paid")).toBe(true);
      expect(canTransitionOrder("paid", "processing")).toBe(true);
      expect(canTransitionOrder("processing", "shipped")).toBe(true);
      expect(canTransitionOrder("shipped", "completed")).toBe(true);
    });

    it("happy path for cash on delivery (COD): new -> processing -> shipped -> completed", () => {
      expect(canTransitionOrder("new", "processing")).toBe(true);
      expect(canTransitionOrder("processing", "shipped")).toBe(true);
      expect(canTransitionOrder("shipped", "completed")).toBe(true);
    });

    it("allows cancellation only from new, paid, and processing", () => {
      expect(canTransitionOrder("new", "cancelled")).toBe(true);
      expect(canTransitionOrder("paid", "cancelled")).toBe(true);
      expect(canTransitionOrder("processing", "cancelled")).toBe(true);

      // Forbidden cancellation once shipped or completed
      expect(canTransitionOrder("shipped", "cancelled")).toBe(false);
      expect(canTransitionOrder("completed", "cancelled")).toBe(false);
    });

    it("forbids reverse transitions (cannot revert to previous status)", () => {
      expect(canTransitionOrder("paid", "new")).toBe(false);
      expect(canTransitionOrder("processing", "paid")).toBe(false);
      expect(canTransitionOrder("processing", "new")).toBe(false);
      expect(canTransitionOrder("shipped", "processing")).toBe(false);
      expect(canTransitionOrder("completed", "shipped")).toBe(false);
      expect(canTransitionOrder("completed", "new")).toBe(false);
    });

    it("terminal statuses (completed, cancelled) cannot transition to any other status", () => {
      ALL_ORDER_STATUSES.filter((s) => s !== "completed").forEach((other) => {
        expect(canTransitionOrder("completed", other)).toBe(false);
      });

      ALL_ORDER_STATUSES.filter((s) => s !== "cancelled").forEach((other) => {
        expect(canTransitionOrder("cancelled", other)).toBe(false);
      });
    });
  });

  describe("3. Helper Functions", () => {
    it("getAllowedNextStatuses returns expected targets", () => {
      expect(getAllowedNextStatuses("new")).toEqual([
        "paid",
        "processing",
        "cancelled",
      ]);
      expect(getAllowedNextStatuses("paid")).toEqual([
        "processing",
        "cancelled",
      ]);
      expect(getAllowedNextStatuses("processing")).toEqual([
        "shipped",
        "cancelled",
      ]);
      expect(getAllowedNextStatuses("shipped")).toEqual(["completed"]);
      expect(getAllowedNextStatuses("completed")).toEqual([]);
      expect(getAllowedNextStatuses("cancelled")).toEqual([]);
    });

    it("isCancelableStatus returns true for new, paid, processing", () => {
      expect(isCancelableStatus("new")).toBe(true);
      expect(isCancelableStatus("paid")).toBe(true);
      expect(isCancelableStatus("processing")).toBe(true);
      expect(isCancelableStatus("shipped")).toBe(false);
      expect(isCancelableStatus("completed")).toBe(false);
      expect(isCancelableStatus("cancelled")).toBe(false);
    });

    it("isTerminalStatus identifies completed and cancelled", () => {
      expect(isTerminalStatus("new")).toBe(false);
      expect(isTerminalStatus("paid")).toBe(false);
      expect(isTerminalStatus("processing")).toBe(false);
      expect(isTerminalStatus("shipped")).toBe(false);
      expect(isTerminalStatus("completed")).toBe(true);
      expect(isTerminalStatus("cancelled")).toBe(true);
    });

    it("ORDER_STATUS_LABELS contains readable Russian names for all statuses", () => {
      ALL_ORDER_STATUSES.forEach((status) => {
        expect(ORDER_STATUS_LABELS[status]).toBeDefined();
        expect(ORDER_STATUS_LABELS[status].length).toBeGreaterThan(0);
      });
      expect(ORDER_STATUS_LABELS.new).toBe("Новый");
      expect(ORDER_STATUS_LABELS.paid).toBe("Оплачен");
      expect(ORDER_STATUS_LABELS.processing).toBe("В обработке");
      expect(ORDER_STATUS_LABELS.shipped).toBe("Доставляется");
      expect(ORDER_STATUS_LABELS.completed).toBe("Завершен");
      expect(ORDER_STATUS_LABELS.cancelled).toBe("Отменен");
    });

    it("ORDER_STATUS_VARIANTS defines badges and styles for all statuses", () => {
      ALL_ORDER_STATUSES.forEach((status) => {
        const variant = ORDER_STATUS_VARIANTS[status];
        expect(variant).toBeDefined();
        expect(variant.label).toBe(ORDER_STATUS_LABELS[status]);
        expect(variant.badgeClass).toBeDefined();
      });
    });
  });
});

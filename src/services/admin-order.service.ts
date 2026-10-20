import mongoose, { FilterQuery } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Order, IOrder, OrderStatus } from "@/models/Order";
import { Product } from "@/models/Product";
import { PromoCode } from "@/models/PromoCode";
import { Payment, IPayment } from "@/models/Payment";
import { NotFoundError } from "@/lib/errors";
import {
  validateStatusTransition,
  ORDER_STATUS_LABELS,
} from "@/lib/order-status";
import { AdminOrdersQuery } from "@/lib/validations/admin-order";

export interface StaffUser {
  id?: string;
  role?: string;
  name?: string;
  email?: string;
}

export interface PaginatedAdminOrdersResult {
  items: IOrder[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminOrderDetailResult {
  order: IOrder;
  payments: IPayment[];
}

/**
 * Returns a paginated list of orders for staff with status, date, and text filters.
 */
export async function getAdminOrders(
  query: AdminOrdersQuery
): Promise<PaginatedAdminOrdersResult> {
  await connectToDatabase();

  const filter: FilterQuery<IOrder> = {
    deletedAt: null,
  };

  // 1. Status filter
  if (query.status && query.status !== "all") {
    filter.status = query.status as OrderStatus;
  }

  // 2. Date range filter
  if (query.dateFrom || query.dateTo) {
    filter.createdAt = {};
    if (query.dateFrom) {
      const fromDate = new Date(query.dateFrom);
      if (!isNaN(fromDate.getTime())) {
        filter.createdAt.$gte = fromDate;
      }
    }
    if (query.dateTo) {
      const toDate = new Date(query.dateTo);
      if (!isNaN(toDate.getTime())) {
        // Include the entire ending day
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }
  }

  // 3. Search query: order number or customer email or customer name
  if (query.q && query.q.trim().length > 0) {
    const term = query.q.trim();
    filter.$or = [
      { number: { $regex: term, $options: "i" } },
      { "contact.email": { $regex: term, $options: "i" } },
      { "contact.fullName": { $regex: term, $options: "i" } },
      { "contact.phone": { $regex: term, $options: "i" } },
    ];
  }

  const total = await Order.countDocuments(filter);
  const totalPages = Math.ceil(total / query.limit) || 1;
  const skip = (query.page - 1) * query.limit;

  const items = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(query.limit)
    .lean<IOrder[]>();

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
  };
}

/**
 * Finds order by MongoDB ObjectId or human-readable number (e.g. KB-10001)
 */
async function findOrderByIdOrNumber(orderIdOrNumber: string): Promise<IOrder | null> {
  await connectToDatabase();

  let order: IOrder | null = null;
  if (mongoose.Types.ObjectId.isValid(orderIdOrNumber)) {
    order = await Order.findOne({
      _id: new mongoose.Types.ObjectId(orderIdOrNumber),
      deletedAt: null,
    });
  }

  if (!order) {
    order = await Order.findOne({
      number: orderIdOrNumber.trim(),
      deletedAt: null,
    });
  }

  return order;
}

/**
 * Retrieves full order details and associated payment records for staff view.
 */
export async function getAdminOrderById(
  orderIdOrNumber: string
): Promise<AdminOrderDetailResult> {
  await connectToDatabase();

  const order = await findOrderByIdOrNumber(orderIdOrNumber);
  if (!order) {
    throw new NotFoundError(`Заказ «${orderIdOrNumber}» не найден`);
  }

  // Load associated payment records
  const payments = await Payment.find({ orderId: order._id })
    .sort({ createdAt: -1 })
    .lean<IPayment[]>();

  return {
    order,
    payments,
  };
}

/**
 * Updates an order status following allowed transition rules (A-05).
 * When cancelling (status -> 'cancelled'), automatically restores stock quantities (A-06)
 * and rolls back promo code usedCount.
 * Appends record to statusHistory and logs notification to console (A-18).
 */
export async function updateAdminOrderStatus(
  orderIdOrNumber: string,
  newStatus: OrderStatus,
  staffUser: StaffUser,
  commentText?: string
): Promise<IOrder> {
  await connectToDatabase();

  const order = await findOrderByIdOrNumber(orderIdOrNumber);
  if (!order) {
    throw new NotFoundError(`Заказ «${orderIdOrNumber}» не найден`);
  }

  const previousStatus = order.status;

  // 1. Validate status transition according to A-05
  validateStatusTransition(previousStatus, newStatus);

  // If already at target status, return unchanged
  if (previousStatus === newStatus) {
    return order;
  }

  // 2. Cancellation: atomically restore reserved stock and promo code usage (A-06)
  if (newStatus === "cancelled" && previousStatus !== "cancelled") {
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.productId },
        { $inc: { stockQuantity: item.quantity } }
      ).catch((err) => {
        console.error(
          `[Stock Compensation] Failed to restore stock for product ${item.productId}:`,
          err
        );
      });
    }

    if (order.promo?.promoCodeId) {
      await PromoCode.updateOne(
        { _id: order.promo.promoCodeId },
        { $inc: { usedCount: -1 } }
      ).catch((err) => {
        console.error(
          `[Promo Compensation] Failed to rollback promo code ${order.promo?.code}:`,
          err
        );
      });
    }
  }

  // 3. Update order document
  order.status = newStatus;

  const staffName = staffUser.name || staffUser.email || "Сотрудник";
  const staffId = staffUser.id || "system";

  order.statusHistory.push({
    from: previousStatus,
    to: newStatus,
    byUserId: staffId,
    byUserName: staffName,
    at: new Date(),
  });

  if (commentText && commentText.trim().length > 0) {
    order.managerComments.push({
      authorId: staffId,
      authorName: staffName,
      text: `[Статус: ${ORDER_STATUS_LABELS[newStatus]}] ${commentText.trim()}`,
      at: new Date(),
    });
  }

  await order.save();

  // 4. Notification log according to A-18
  console.log(
    `[Order Notification] [A-18] Заказ ${order.number}: статус изменен с «${ORDER_STATUS_LABELS[previousStatus]}» на «${ORDER_STATUS_LABELS[newStatus]}» сотрудником ${staffName} (${staffUser.role || "staff"}).`
  );

  return order;
}

/**
 * Adds an internal manager comment to the order.
 */
export async function addAdminOrderComment(
  orderIdOrNumber: string,
  text: string,
  staffUser: StaffUser
): Promise<IOrder> {
  await connectToDatabase();

  const order = await findOrderByIdOrNumber(orderIdOrNumber);
  if (!order) {
    throw new NotFoundError(`Заказ «${orderIdOrNumber}» не найден`);
  }

  const staffName = staffUser.name || staffUser.email || "Сотрудник";
  const staffId = staffUser.id || "system";

  order.managerComments.push({
    authorId: staffId,
    authorName: staffName,
    text: text.trim(),
    at: new Date(),
  });

  await order.save();

  console.log(
    `[Order Comment] [A-18] Заказ ${order.number}: добавлен комментарий сотрудником ${staffName} (${staffUser.role || "staff"}): "${text.trim()}".`
  );

  return order;
}

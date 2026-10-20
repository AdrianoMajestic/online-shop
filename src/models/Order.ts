import mongoose, { Schema, Document, Model } from "mongoose";

export type OrderStatus =
  | "new"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export type PaymentMethodType = "card_online" | "cod";

export interface IOrderContact {
  fullName: string;
  phone: string;
  email: string;
}

export interface IOrderShippingAddress {
  city: string;
  street: string;
  house: string;
  apartment?: string;
  postalCode: string;
  comment?: string;
}

export interface IOrderDeliverySnapshot {
  methodId: mongoose.Types.ObjectId | null;
  title: string;
  price: number; // in kopecks
}

export interface IOrderItemSnapshot {
  productId: mongoose.Types.ObjectId;
  sku: string;
  title: string;
  quantity: number;
  pricePerUnit: number; // in kopecks
  totalPrice: number; // in kopecks (quantity * pricePerUnit)
}

export interface IOrderPromoSnapshot {
  promoCodeId: mongoose.Types.ObjectId | null;
  code: string;
  discountAmount: number; // in kopecks
}

export interface IOrderManagerComment {
  authorId: mongoose.Types.ObjectId;
  text: string;
  at: Date;
}

export interface IOrderStatusHistory {
  from: string;
  to: string;
  byUserId: mongoose.Types.ObjectId | null;
  at: Date;
}

export interface IOrder extends Document {
  number: string; // Human-readable unique order number, e.g. "KB-10001"
  userId: mongoose.Types.ObjectId | string | null; // nullable for guests
  contact: IOrderContact;
  shippingAddress: IOrderShippingAddress;
  delivery: IOrderDeliverySnapshot;
  items: IOrderItemSnapshot[];
  promo: IOrderPromoSnapshot | null;
  totalAmount: number; // in kopecks
  discountAmount: number; // in kopecks
  deliveryCost: number; // in kopecks
  finalAmount: number; // in kopecks: totalAmount - discountAmount + deliveryCost
  status: OrderStatus;
  paymentMethod: PaymentMethodType;
  customerComment: string;
  managerComments: IOrderManagerComment[];
  statusHistory: IOrderStatusHistory[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderContactSchema = new Schema<IOrderContact>(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

const OrderShippingAddressSchema = new Schema<IOrderShippingAddress>(
  {
    city: { type: String, required: true, trim: true },
    street: { type: String, required: true, trim: true },
    house: { type: String, required: true, trim: true },
    apartment: { type: String, default: "", trim: true },
    postalCode: { type: String, required: true, trim: true },
    comment: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const OrderDeliverySnapshotSchema = new Schema<IOrderDeliverySnapshot>(
  {
    methodId: { type: Schema.Types.Mixed, ref: "DeliveryMethod", default: null },
    title: { type: String, required: true, trim: true },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Стоимость доставки должна быть целым числом в копейках",
      },
    },
  },
  { _id: false }
);

const OrderItemSnapshotSchema = new Schema<IOrderItemSnapshot>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Количество товара должно быть целым числом",
      },
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Цена за единицу должна быть целым числом в копейках",
      },
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Итоговая цена позиции должна быть целым числом в копейках",
      },
    },
  },
  { _id: false }
);

const OrderPromoSnapshotSchema = new Schema<IOrderPromoSnapshot>(
  {
    promoCodeId: { type: Schema.Types.ObjectId, ref: "PromoCode", default: null },
    code: { type: String, required: true, trim: true, uppercase: true },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Скидка по промокоду должна быть целым числом в копейках",
      },
    },
  },
  { _id: false }
);

const OrderManagerCommentSchema = new Schema<IOrderManagerComment>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderStatusHistorySchema = new Schema<IOrderStatusHistory>(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    byUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    number: {
      type: String,
      required: [true, "Номер заказа обязателен"],
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: Schema.Types.Mixed,
      ref: "User",
      default: null,
      index: true,
    },
    contact: {
      type: OrderContactSchema,
      required: [true, "Контакты покупателя обязательны"],
    },
    shippingAddress: {
      type: OrderShippingAddressSchema,
      required: [true, "Адрес доставки обязателен"],
    },
    delivery: {
      type: OrderDeliverySnapshotSchema,
      required: [true, "Параметры доставки обязательны"],
    },
    items: {
      type: [OrderItemSnapshotSchema],
      required: [true, "Состав заказа обязателен"],
      validate: {
        validator: (v: IOrderItemSnapshot[]) => v.length > 0,
        message: "В заказе должен быть хотя бы один товар",
      },
    },
    promo: {
      type: OrderPromoSnapshotSchema,
      default: null,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Сумма товаров должна быть целым числом в копейках",
      },
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Сумма скидки должна быть целым числом в копейках",
      },
    },
    deliveryCost: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Стоимость доставки должна быть целым числом в копейках",
      },
    },
    finalAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Итоговая сумма заказа должна быть целым числом в копейках",
      },
    },
    status: {
      type: String,
      enum: {
        values: ["new", "paid", "processing", "shipped", "completed", "cancelled"],
        message: "Недопустимый статус заказа",
      },
      default: "new",
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ["card_online", "cod"],
        message: "Недопустимый способ оплаты",
      },
      required: [true, "Способ оплаты обязателен"],
    },
    customerComment: {
      type: String,
      default: "",
      trim: true,
    },
    managerComments: {
      type: [OrderManagerCommentSchema],
      default: [],
    },
    statusHistory: {
      type: [OrderStatusHistorySchema],
      default: [],
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

OrderSchema.index({ createdAt: -1 });

export const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;

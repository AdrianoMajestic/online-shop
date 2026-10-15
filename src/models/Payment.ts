import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface IPayment extends Document {
  orderId: mongoose.Types.ObjectId;
  provider: string; // "mock"
  externalPaymentId: string;
  method: string; // "card_online" | "cod"
  status: PaymentStatus;
  amount: number; // in kopecks
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "ID заказа обязателен"],
      index: true,
    },
    provider: {
      type: String,
      default: "mock",
      trim: true,
    },
    externalPaymentId: {
      type: String,
      required: [true, "Внешний ID платежа обязателен"],
      unique: true,
      trim: true,
      index: true,
    },
    method: {
      type: String,
      enum: ["card_online", "cod"],
      required: [true, "Метод оплаты обязателен"],
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "succeeded", "failed", "refunded"],
        message: "Недопустимый статус платежа",
      },
      default: "pending",
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Сумма платежа обязательна"],
      min: [0, "Сумма не может быть отрицательной"],
      validate: {
        validator: Number.isInteger,
        message: "Сумма платежа должна быть целым числом в копейках",
      },
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);

export default Payment;

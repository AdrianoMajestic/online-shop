import mongoose, { Schema, Document, Model } from "mongoose";

export type PromoDiscountType = "percentage" | "fixed";

export interface IPromoCode extends Document {
  code: string;
  discountType: PromoDiscountType;
  discountValue: number; // percentage (1-100) or fixed amount in kopecks
  minOrderAmount: number; // in kopecks
  validFrom: Date;
  validTo: Date;
  usageLimit: number; // 0 for unlimited
  usedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: {
      type: String,
      required: [true, "Код промокода обязателен"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    discountType: {
      type: String,
      enum: {
        values: ["percentage", "fixed"],
        message: "Тип скидки должен быть percentage или fixed",
      },
      required: [true, "Тип скидки промокода обязателен"],
    },
    discountValue: {
      type: Number,
      required: [true, "Значение скидки обязательно"],
      min: [1, "Значение скидки должно быть больше 0"],
      validate: {
        validator: function (this: IPromoCode, v: number) {
          if (this.discountType === "percentage") {
            return v >= 1 && v <= 100;
          }
          return Number.isInteger(v) && v > 0;
        },
        message: "Для percentage значение должно быть от 1 до 100, для fixed — целым числом в копейках",
      },
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Минимальная сумма заказа не может быть отрицательной"],
      validate: {
        validator: Number.isInteger,
        message: "Минимальная сумма заказа должна быть целым числом в копейках",
      },
    },
    validFrom: {
      type: Date,
      required: [true, "Дата начала действия обязательна"],
    },
    validTo: {
      type: Date,
      required: [true, "Дата окончания действия обязательна"],
    },
    usageLimit: {
      type: Number,
      default: 0, // 0 means no limit
      min: [0, "Лимит использований не может быть отрицательным"],
      validate: {
        validator: Number.isInteger,
        message: "Лимит использований должен быть целым числом",
      },
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Количество использований не может быть отрицательным"],
      validate: {
        validator: Number.isInteger,
        message: "Количество использований должно быть целым числом",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const PromoCode: Model<IPromoCode> =
  mongoose.models.PromoCode || mongoose.model<IPromoCode>("PromoCode", PromoCodeSchema);

export default PromoCode;

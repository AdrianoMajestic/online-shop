import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDeliveryMethod extends Document {
  code: string;
  title: string;
  price: number; // in kopecks
  description: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryMethodSchema = new Schema<IDeliveryMethod>(
  {
    code: {
      type: String,
      required: [true, "Код способа доставки обязателен"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Название способа доставки обязательно"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Стоимость доставки обязательна"],
      min: [0, "Стоимость не может быть отрицательной"],
      validate: {
        validator: Number.isInteger,
        message: "Стоимость доставки должна быть целым числом в копейках",
      },
    },
    description: {
      type: String,
      default: "",
      trim: true,
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

export const DeliveryMethod: Model<IDeliveryMethod> =
  mongoose.models.DeliveryMethod ||
  mongoose.model<IDeliveryMethod>("DeliveryMethod", DeliveryMethodSchema);

export default DeliveryMethod;

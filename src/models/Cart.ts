import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ICart extends Document {
  userId: string | mongoose.Types.ObjectId;
  items: ICartItem[];
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "ID товара обязателен"],
    },
    quantity: {
      type: Number,
      required: [true, "Количество обязательно"],
      min: [1, "Количество должно быть не менее 1"],
      validate: {
        validator: Number.isInteger,
        message: "Количество должно быть целым числом",
      },
    },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.Mixed,
      required: [true, "ID пользователя обязателен"],
      unique: true,
      index: true,
    },
    items: {
      type: [CartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Cart: Model<ICart> =
  mongoose.models.Cart || mongoose.model<ICart>("Cart", CartSchema);

export default Cart;

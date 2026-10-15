import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId;
  city: string;
  street: string;
  house: string;
  apartment: string;
  postalCode: string;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ID пользователя обязателен"],
      index: true,
    },
    city: {
      type: String,
      required: [true, "Город обязателен"],
      trim: true,
    },
    street: {
      type: String,
      required: [true, "Улица обязательна"],
      trim: true,
    },
    house: {
      type: String,
      required: [true, "Номер дома обязателен"],
      trim: true,
    },
    apartment: {
      type: String,
      default: "",
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, "Почтовый индекс обязателен"],
      trim: true,
    },
    comment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Address: Model<IAddress> =
  mongoose.models.Address || mongoose.model<IAddress>("Address", AddressSchema);

export default Address;

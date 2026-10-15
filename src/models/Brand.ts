import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBrand extends Document {
  title: string;
  slug: string;
  logoUrl: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    title: {
      type: String,
      required: [true, "Название бренда обязательно"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug бренда обязателен"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    logoUrl: {
      type: String,
      default: "",
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Brand: Model<IBrand> =
  mongoose.models.Brand || mongoose.model<IBrand>("Brand", BrandSchema);

export default Brand;

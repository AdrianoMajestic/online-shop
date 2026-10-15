import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICategory extends Document {
  parentId: mongoose.Types.ObjectId | null;
  title: string;
  slug: string;
  description: string;
  isVisible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Название категории обязательно"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug категории обязателен"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Category: Model<ICategory> =
  mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

export default Category;

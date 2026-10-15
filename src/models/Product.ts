import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProductImage {
  url: string;
  alt: string;
}

export interface IProductAttribute {
  key: string;
  value: string;
}

export interface IProduct extends Document {
  categoryId: mongoose.Types.ObjectId;
  brandId: mongoose.Types.ObjectId;
  sku: string;
  title: string;
  slug: string;
  description: string;
  price: number; // in kopecks
  discountPrice: number | null; // in kopecks
  stockQuantity: number;
  isPublished: boolean;
  images: IProductImage[];
  attributes: IProductAttribute[];
  ratingAvg: number;
  reviewsCount: number;
  salesCount: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProductImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true, trim: true },
    alt: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const ProductAttributeSchema = new Schema<IProductAttribute>(
  {
    key: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Категория товара обязательна"],
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Бренд товара обязателен"],
      index: true,
    },
    sku: {
      type: String,
      required: [true, "SKU (артикул) товара обязателен"],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Название товара обязательно"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Slug товара обязателен"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Описание товара обязательно"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Цена товара обязательна"],
      min: [0, "Цена не может быть отрицательной"],
      validate: {
        validator: Number.isInteger,
        message: "Цена должна быть целым числом в копейках",
      },
      index: true,
    },
    discountPrice: {
      type: Number,
      default: null,
      min: [0, "Цена со скидкой не может быть отрицательной"],
      validate: {
        validator: (v: number | null) => v === null || Number.isInteger(v),
        message: "Цена со скидкой должна быть целым числом в копейках",
      },
    },
    stockQuantity: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Остаток на складе не может быть отрицательным"],
      validate: {
        validator: Number.isInteger,
        message: "Остаток на складе должен быть целым числом",
      },
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    images: {
      type: [ProductImageSchema],
      default: [],
    },
    attributes: {
      type: [ProductAttributeSchema],
      default: [],
    },
    ratingAvg: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
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

// Full-text search index for catalog search
ProductSchema.index({ title: "text", description: "text" });

export const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema);

export default Product;

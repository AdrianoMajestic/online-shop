import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReviewManagerReply {
  authorId: mongoose.Types.ObjectId;
  text: string;
  at: Date;
}

export interface IReview extends Document {
  userId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  rating: number; // 1 to 5
  comment: string;
  isApproved: boolean;
  managerReply: IReviewManagerReply | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewManagerReplySchema = new Schema<IReviewManagerReply>(
  {
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReviewSchema = new Schema<IReview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "ID пользователя обязателен"],
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "ID товара обязателен"],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Оценка обязательна"],
      min: [1, "Минимальная оценка — 1"],
      max: [5, "Максимальная оценка — 5"],
      validate: {
        validator: Number.isInteger,
        message: "Оценка должна быть целым числом от 1 до 5",
      },
    },
    comment: {
      type: String,
      required: [true, "Текст отзыва обязателен"],
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    managerReply: {
      type: ReviewManagerReplySchema,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One review per product per user
ReviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;

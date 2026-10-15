import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | null;
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown>;
  ip: string;
  at: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    action: {
      type: String,
      required: [true, "Действие обязательно"],
      trim: true,
      index: true,
    },
    entity: {
      type: String,
      required: [true, "Сущность обязательна"],
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      required: [true, "ID сущности обязателен"],
      trim: true,
      index: true,
    },
    meta: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: "",
      trim: true,
    },
    at: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | string | null;
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
      type: Schema.Types.Mixed,
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
    bufferCommands: false,
  }
);

AuditLogSchema.index({ action: 1, at: -1 });
AuditLogSchema.index({ entity: 1, at: -1 });
AuditLogSchema.index({ at: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;

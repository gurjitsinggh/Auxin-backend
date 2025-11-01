import mongoose, { Document, Schema } from 'mongoose';

export interface IPendingUser extends Document {
  _id: string;
  name: string;
  email: string;
  password?: string;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PendingUserSchema = new Schema<IPendingUser>({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, lowercase: true, trim: true },
  password: { type: String, minlength: 6 },
  emailVerificationCode: { type: String },
  emailVerificationExpires: { type: Date }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret: Record<string, unknown>) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password; // Do not expose raw password in any API responses
      return ret;
    }
  }
});

PendingUserSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.PendingUser || mongoose.model<IPendingUser>('PendingUser', PendingUserSchema);



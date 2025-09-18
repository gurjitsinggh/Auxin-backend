import mongoose, { Schema } from 'mongoose';
const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        minlength: 6,
        select: false // Don't include password in queries by default
    },
    googleId: {
        type: String
    },
    avatar: {
        type: String,
        default: ''
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function (_doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            delete ret.password;
            return ret;
        }
    }
});
// Index for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ googleId: 1 }, { sparse: true }); // Sparse index allows multiple null values
export default mongoose.models.User || mongoose.model('User', UserSchema);
//# sourceMappingURL=User.js.map
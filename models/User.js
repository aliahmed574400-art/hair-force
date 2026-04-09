import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    city: { type: String },
    vendorSlug: { type: String },
    role: {
      type: String,
      enum: ["client", "vendor", "admin"],
      default: "client"
    },
    passwordHash: { type: String, required: true },
    avatar: { type: String }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);

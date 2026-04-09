import mongoose, { Schema } from "mongoose";

const ServiceSchema = new Schema(
  {
    vendorSlug: { type: String, required: true, index: true },
    vendorName: { type: String, required: true },
    title: { type: String, required: true },
    category: { type: String },
    duration: { type: String, required: true },
    price: { type: Number, required: true },
    depositType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage"
    },
    depositValue: { type: Number, default: 20 },
    imageUrl: { type: String },
    description: { type: String },
    featured: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.models.Service || mongoose.model("Service", ServiceSchema);

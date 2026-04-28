import mongoose, { Schema } from "mongoose";

const BookingSchema = new Schema(
  {
    vendorSlug: { type: String, required: true, index: true },
    vendorName: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String },
    customerId: { type: String },
    serviceId: { type: String, required: true },
    serviceName: { type: String, required: true },
    appointmentDate: { type: String, required: true },
    appointmentSlot: { type: String, required: true },
    total: { type: Number, required: true },
    depositAmount: { type: Number, default: 0 },
    remainingAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["pay_later", "deposit_due", "deposit_paid", "paid_full"],
      default: "pay_later"
    },
    paymentIntentId: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ["pending_approval", "confirmed", "completed", "cancelled", "declined"],
      default: "confirmed"
    },
    source: { type: String, default: "web" },
    bookingMethod: {
      type: String,
      enum: ["instant", "approval"],
      default: "instant"
    },
    requestedAt: { type: Date },
    approvedAt: { type: Date },
    declinedAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.models.Booking || mongoose.model("Booking", BookingSchema);

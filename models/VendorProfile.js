import mongoose, { Schema } from "mongoose";

const VendorProfileSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    owner: { type: String, required: true },
    category: { type: String, required: true },
    city: { type: String, required: true },
    location: { type: String, required: true },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    priceFrom: { type: Number, default: 0 },
    responseTime: { type: String },
    verified: { type: Boolean, default: false },
    heroTag: { type: String },
    tagline: { type: String },
    bio: { type: String },
    coverImage: { type: String },
    galleryImages: [{ type: String }],
    specialties: [{ type: String }],
    amenities: [{ type: String }],
    coverGradient: { type: String },
    metrics: {
      repeatClients: { type: String },
      monthlyBookings: { type: String },
      showUpRate: { type: String }
    },
    gallery: [
      {
        title: String,
        caption: String
      }
    ],
    reviews: [
      {
        author: String,
        text: String,
        rating: Number
      }
    ],
    bookingWindows: [
      {
        date: String,
        label: String,
        slots: [String]
      }
    ],
    availabilityRules: [
      {
        dayOfWeek: Number,
        startTime: String,
        endTime: String,
        slotMinutes: Number,
        active: Boolean
      }
    ],
    blackoutDates: [{ type: String }],
    status: {
      type: String,
      enum: ["active", "pending", "rejected", "lead", "draft"],
      default: "pending"
    }
  },
  { timestamps: true }
);

export default mongoose.models.VendorProfile ||
  mongoose.model("VendorProfile", VendorProfileSchema);

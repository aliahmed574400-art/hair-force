import mongoose, { Schema } from "mongoose";

const VendorProfileSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    owner: { type: String, required: true },
    category: { type: String, required: true },
    state: { type: String, default: "" },
    city: { type: String, required: true },
    area: { type: String, default: "" },
    location: { type: String, required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    locationPrecision: {
      type: String,
      enum: ["approx_area", "exact"],
      default: "approx_area"
    },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    priceFrom: { type: Number, default: 0 },
    responseTime: { type: String },
    verified: { type: Boolean, default: false },
    heroTag: { type: String },
    tagline: { type: String },
    bio: { type: String },
    coverImage: { type: String },
    avatar: { type: String },
    galleryImages: [{ type: String }],
    portfolioImages: [{ type: String }],
    specialties: [{ type: String }],
    amenities: [{ type: String }],
    serviceLocationType: { type: String, default: "studio" },
    policies: {
      deposit: { type: String },
      cancellation: { type: String },
      lateArrival: { type: String },
      prepInstructions: { type: String }
    },
    socialLinks: {
      instagram: { type: String },
      website: { type: String },
      tiktok: { type: String },
      facebook: { type: String }
    },
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
    availabilityOverrides: [
      {
        id: String,
        type: String,
        startDate: String,
        endDate: String,
        startTime: String,
        endTime: String,
        slotMinutes: Number,
        note: String,
        createdAt: String,
        updatedAt: String
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

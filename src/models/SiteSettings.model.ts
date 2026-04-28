import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUsefulLink {
  label: string;
  url: string;
  group: string;
  order: number;
  isActive: boolean;
}

export interface ISocialLink {
  platform: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface ISiteSettings extends Document {
  footerDescription: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  copyrightText: string;

  journalInfoTitle: string;
  publisherName: string;
  publishingModel: string;
  language: string;
  publicationFrequency: string;

  usefulLinks: IUsefulLink[];
  socialLinks: ISocialLink[];

  isPublished: boolean;
}

const usefulLinkSchema = new Schema<IUsefulLink>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    group: {
      type: String,
      default: "General",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const socialLinkSchema = new Schema<ISocialLink>(
  {
    platform: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const siteSettingsSchema = new Schema<ISiteSettings>(
  {
    footerDescription: {
      type: String,
      default:
        "BUP Faculty of Science and Technology Journal publishes scholarly research in science, technology, engineering, and interdisciplinary areas.",
    },

    contactEmail: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    contactPhone: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "Bangladesh University of Professionals, Dhaka, Bangladesh",
    },

    copyrightText: {
      type: String,
      default:
        "© Bangladesh University of Professionals. All rights reserved.",
    },

    journalInfoTitle: {
      type: String,
      default: "Journal Information",
      trim: true,
    },

    publisherName: {
      type: String,
      default: "Bangladesh University of Professionals",
      trim: true,
    },

    publishingModel: {
      type: String,
      default: "Open Access",
      trim: true,
    },

    language: {
      type: String,
      default: "English",
      trim: true,
    },

    publicationFrequency: {
      type: String,
      default: "Regular",
      trim: true,
    },

    usefulLinks: {
      type: [usefulLinkSchema],
      default: [],
    },

    socialLinks: {
      type: [socialLinkSchema],
      default: [],
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const SiteSettings: Model<ISiteSettings> =
  mongoose.models.SiteSettings ||
  mongoose.model<ISiteSettings>("SiteSettings", siteSettingsSchema);

export default SiteSettings;
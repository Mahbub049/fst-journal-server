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

export interface IAnnouncementItem {
  text: string;
  url: string;
  order: number;
  isActive: boolean;
}

export interface ISiteSettings extends Document {
  footerJournalTitle: string;
  footerJournalSubtitle: string;
  footerDescription: string;
  publisherLabel: string;
  publisherName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  copyrightText: string;
  footerCreditText: string;
  footerCreditUrl: string;

  journalInfoTitle: string;
  publishingModel: string;
  language: string;
  publicationFrequency: string;

  announcementItems: IAnnouncementItem[];
  announcementSpeedSeconds: number;
  announcementGapPixels: number;

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

const announcementItemSchema = new Schema<IAnnouncementItem>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      default: "",
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
    footerJournalTitle: {
      type: String,
      default: "Journal of FST",
      trim: true,
    },

    footerJournalSubtitle: {
      type: String,
      default: "Bangladesh University of Professionals",
      trim: true,
    },

    footerDescription: {
      type: String,
      default:
        "A scholarly journal platform dedicated to publishing quality research in science, technology, engineering, and related interdisciplinary fields.",
    },

    publisherLabel: {
      type: String,
      default: "Publisher",
      trim: true,
    },

    publisherName: {
      type: String,
      default: "Faculty of Science & Technology, BUP",
      trim: true,
    },

    contactEmail: {
      type: String,
      default: "journal.fst@bup.edu.bd",
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
      default: "Bangladesh University of Professionals, Mirpur Cantonment, Dhaka - 1216",
    },

    copyrightText: {
      type: String,
      default: "Copyright © 2026 Journal of FST. All rights reserved.",
    },

    footerCreditText: {
      type: String,
      default: "Designed for academic publishing and research visibility.",
    },

    footerCreditUrl: {
      type: String,
      default: "",
      trim: true,
    },

    journalInfoTitle: {
      type: String,
      default: "Journal Information",
      trim: true,
    },

    publishingModel: {
      type: String,
      default: "Hybrid",
      trim: true,
    },

    language: {
      type: String,
      default: "English",
      trim: true,
    },

    publicationFrequency: {
      type: String,
      default: "Annual",
      trim: true,
    },

    announcementItems: {
      type: [announcementItemSchema],
      default: [
        {
          text: "Welcome to the official website of Journal of FST",
          url: "",
          order: 1,
          isActive: true,
        },
        {
          text: "Call for Papers is now open",
          url: "/call-for-papers",
          order: 2,
          isActive: true,
        },
        {
          text: "Submit your research manuscript through the online submission system",
          url: "/submit-manuscript-portal",
          order: 3,
          isActive: true,
        },
        {
          text: "Explore current and archived issues of the journal",
          url: "/issues/archive",
          order: 4,
          isActive: true,
        },
      ],
    },

    announcementSpeedSeconds: {
      type: Number,
      default: 100,
      min: 10,
      max: 300,
    },

    announcementGapPixels: {
      type: Number,
      default: 120,
      min: 24,
      max: 480,
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

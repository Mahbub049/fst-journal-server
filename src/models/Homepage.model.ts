import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHomepageMetric {
  label: string;
  value: string;
  description?: string;
  order: number;
  isActive: boolean;
}

export interface IHomepageInfoItem {
  label: string;
  value: string;
  order: number;
  isActive: boolean;
}

export interface IHomepageButton {
  label: string;
  url: string;
  variant: "primary" | "secondary";
  order: number;
  isActive: boolean;
}

export interface IHomepage extends Document {
  heroTitle: string;
  heroSubtitle: string;
  journalCoverImage: string;
  publishingModel: string;
  issnPrint: string;
  issnOnline: string;

  metrics: IHomepageMetric[];

  overviewTitle: string;
  overviewContent: string;

  journalInfoTitle: string;
  journalInfoItems: IHomepageInfoItem[];

  executiveEditorsTitle: string;
  executiveEditorsSubtitle: string;

  articlesSectionTitle: string;
  articlesSectionSubtitle: string;

  recentIssuesTitle: string;
  recentIssuesSubtitle: string;

  buttons: IHomepageButton[];

  isPublished: boolean;
}

const metricSchema = new Schema<IHomepageMetric>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
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

const infoItemSchema = new Schema<IHomepageInfoItem>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
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

const buttonSchema = new Schema<IHomepageButton>(
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
    variant: {
      type: String,
      enum: ["primary", "secondary"],
      default: "primary",
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

const homepageSchema = new Schema<IHomepage>(
  {
    heroTitle: {
      type: String,
      required: true,
      default: "BUP Faculty of Science and Technology Journal",
    },

    heroSubtitle: {
      type: String,
      default:
        "An academic journal of Bangladesh University of Professionals.",
    },

    journalCoverImage: {
      type: String,
      default: "/images/journal-cover.jpg",
    },

    publishingModel: {
      type: String,
      default: "Open Access",
    },

    issnPrint: {
      type: String,
      default: "",
    },

    issnOnline: {
      type: String,
      default: "",
    },

    metrics: {
      type: [metricSchema],
      default: [],
    },

    overviewTitle: {
      type: String,
      default: "Overview",
    },

    overviewContent: {
      type: String,
      default:
        "The BUP Faculty of Science and Technology Journal publishes quality research in science, technology, engineering, and related interdisciplinary areas.",
    },

    journalInfoTitle: {
      type: String,
      default: "Journal Information",
    },

    journalInfoItems: {
      type: [infoItemSchema],
      default: [],
    },

    executiveEditorsTitle: {
      type: String,
      default: "Executive Editors",
    },

    executiveEditorsSubtitle: {
      type: String,
      default: "Meet the executive editorial members of the journal.",
    },

    articlesSectionTitle: {
      type: String,
      default: "Articles",
    },

    articlesSectionSubtitle: {
      type: String,
      default: "Explore recently published articles.",
    },

    recentIssuesTitle: {
      type: String,
      default: "Recent Issues",
    },

    recentIssuesSubtitle: {
      type: String,
      default: "Browse the latest published issues of the journal.",
    },

    buttons: {
      type: [buttonSchema],
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

const Homepage: Model<IHomepage> =
  mongoose.models.Homepage ||
  mongoose.model<IHomepage>("Homepage", homepageSchema);

export default Homepage;
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IImportantDate {
  label: string;
  date: string;
  order: number;
  isActive: boolean;
}

export interface ITopic {
  title: string;
  description: string;
  order: number;
  isActive: boolean;
}

export interface IInstruction {
  text: string;
  order: number;
  isActive: boolean;
}

export interface ICallForPaper extends Document {
  title: string;
  subtitle: string;
  description: string;

  posterImage: string;
  pdfUrl: string;

  importantDates: IImportantDate[];

  submissionButtonLabel: string;
  submissionButtonLink: string;

  contactEmail: string;
  contactPhone: string;
  publisherInfo: string;

  topics: ITopic[];
  instructions: IInstruction[];

  isPublished: boolean;
}

const importantDateSchema = new Schema<IImportantDate>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
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

const topicSchema = new Schema<ITopic>(
  {
    title: {
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

const instructionSchema = new Schema<IInstruction>(
  {
    text: {
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

const callForPaperSchema = new Schema<ICallForPaper>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Call for Papers",
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    posterImage: {
      type: String,
      default: "",
      trim: true,
    },

    pdfUrl: {
      type: String,
      default: "",
      trim: true,
    },

    importantDates: {
      type: [importantDateSchema],
      default: [],
    },

    submissionButtonLabel: {
      type: String,
      default: "Submit Manuscript",
      trim: true,
    },

    submissionButtonLink: {
      type: String,
      default: "",
      trim: true,
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

    publisherInfo: {
      type: String,
      default: "",
    },

    topics: {
      type: [topicSchema],
      default: [],
    },

    instructions: {
      type: [instructionSchema],
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

const CallForPaper: Model<ICallForPaper> =
  mongoose.models.CallForPaper ||
  mongoose.model<ICallForPaper>("CallForPaper", callForPaperSchema);

export default CallForPaper;
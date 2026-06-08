import mongoose, { Document, Model, Schema } from "mongoose";

export interface IImportantDate {
  label: string;
  date: string;
  order: number;
  isActive: boolean;
}

export interface ICallForPaper extends Document {
  invitationLabel: string;
  title: string;
  subtitle: string;
  description: string;

  posterImage: string;
  pdfUrl: string;
  pdfTitle: string;
  pdfSubtitle: string;

  submissionFormatLabel: string;
  submissionFormatTitle: string;
  submissionFormatDescription: string;
  submissionTypes: string[];

  scopeLabel: string;
  scopeTitle: string;
  scopeDescription: string;
  engineeringTitle: string;
  engineeringTopics: string[];
  environmentalTitle: string;
  environmentalTopics: string[];

  finalSectionLabel: string;
  finalSectionTitle: string;
  finalSectionDescription: string;

  importantInfoLabel: string;
  timelineTitle: string;
  importantDates: IImportantDate[];

  submitSectionLabel: string;
  submitTitle: string;
  submitDescription: string;
  submissionButtonLabel: string;
  submissionButtonLink: string;
  guidelinesButtonLabel: string;
  guidelinesButtonLink: string;

  contactSectionLabel: string;
  contactTitle: string;
  contactEditorLabel: string;
  contactEditorName: string;
  publishedByLabel: string;
  publishedBy: string;
  publisherName: string;
  publisherAddress: string;
  contactEmail: string;
  contactPhone: string;
  publisherInfo: string;

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

const callForPaperSchema = new Schema<ICallForPaper>(
  {
    invitationLabel: {
      type: String,
      default: "Publication Invitation",
      trim: true,
    },
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
      default: "/pdfs/call-for-papers.pdf",
      trim: true,
    },
    pdfTitle: {
      type: String,
      default: "Call for Papers Document",
      trim: true,
    },
    pdfSubtitle: {
      type: String,
      default: "Volume 4, Issue 1",
      trim: true,
    },

    submissionFormatLabel: {
      type: String,
      default: "Submission Format",
      trim: true,
    },
    submissionFormatTitle: {
      type: String,
      default: "Types of Manuscripts Accepted",
      trim: true,
    },
    submissionFormatDescription: {
      type: String,
      default: "",
    },
    submissionTypes: {
      type: [String],
      default: [],
    },

    scopeLabel: {
      type: String,
      default: "Scope of Submission",
      trim: true,
    },
    scopeTitle: {
      type: String,
      default: "Suggested Research Areas",
      trim: true,
    },
    scopeDescription: {
      type: String,
      default: "",
    },
    engineeringTitle: {
      type: String,
      default: "Engineering, ICT and Computing Areas",
      trim: true,
    },
    engineeringTopics: {
      type: [String],
      default: [],
    },
    environmentalTitle: {
      type: String,
      default: "Environmental Science and Management Areas",
      trim: true,
    },
    environmentalTopics: {
      type: [String],
      default: [],
    },

    finalSectionLabel: {
      type: String,
      default: "Final Accepted Papers",
      trim: true,
    },
    finalSectionTitle: {
      type: String,
      default: "Final Submission Requirements",
      trim: true,
    },
    finalSectionDescription: {
      type: String,
      default: "",
    },

    importantInfoLabel: {
      type: String,
      default: "Important Information",
      trim: true,
    },
    timelineTitle: {
      type: String,
      default: "Current Issue Timeline",
      trim: true,
    },
    importantDates: {
      type: [importantDateSchema],
      default: [],
    },

    submitSectionLabel: {
      type: String,
      default: "Submit Manuscript",
      trim: true,
    },
    submitTitle: {
      type: String,
      default: "Ready to submit?",
      trim: true,
    },
    submitDescription: {
      type: String,
      default: "",
    },
    submissionButtonLabel: {
      type: String,
      default: "Email Manuscript",
      trim: true,
    },
    submissionButtonLink: {
      type: String,
      default: "mailto:journal.fst@bup.edu.bd",
      trim: true,
    },
    guidelinesButtonLabel: {
      type: String,
      default: "View Submission Guidelines",
      trim: true,
    },
    guidelinesButtonLink: {
      type: String,
      default: "/for-authors/submission-guidelines",
      trim: true,
    },

    contactSectionLabel: {
      type: String,
      default: "Contact",
      trim: true,
    },
    contactTitle: {
      type: String,
      default: "Editorial Office",
      trim: true,
    },
    contactEditorLabel: {
      type: String,
      default: "Chief Editor",
      trim: true,
    },
    contactEditorName: {
      type: String,
      default: "Brigadier General Sufi Md Ataur Rahman, ndc, psc",
      trim: true,
    },
    publishedByLabel: {
      type: String,
      default: "Published By",
      trim: true,
    },
    publishedBy: {
      type: String,
      default: "Faculty of Science and Technology",
      trim: true,
    },
    publisherName: {
      type: String,
      default: "Bangladesh University of Professionals",
      trim: true,
    },
    publisherAddress: {
      type: String,
      default: "Mirpur Cantonment, Dhaka - 1216",
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
    publisherInfo: {
      type: String,
      default: "Bangladesh University of Professionals",
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

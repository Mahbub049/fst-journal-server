import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEditorialBoard extends Document {
  category: string;
  editorialArea: string;
  name: string;
  designation: string;
  institution: string;
  department: string;
  expertise: string[];
  profileImage: string;
  bio: string;
  email: string;
  professionalProfileUrl: string;
  googleScholarUrl: string;
  researchGateUrl: string;
  linkedinUrl: string;
  orcidUrl: string;
  scopusUrl: string;
  webOfScienceUrl: string;
  personalWebsiteUrl: string;
  biographyUrl: string;
  professionalProfileLabel: string;
  biographyLabel: string;
  order: number;
  isActive: boolean;
}

const editorialBoardSchema = new Schema<IEditorialBoard>(
  {
    category: {
      type: String,
      required: true,
      trim: true,
      default: "Editorial Board Member",
    },

    editorialArea: {
      type: String,
      required: true,
      trim: true,
      default: "General",
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    designation: {
      type: String,
      default: "",
      trim: true,
    },

    institution: {
      type: String,
      default: "",
      trim: true,
    },

    department: {
      type: String,
      default: "",
      trim: true,
    },

    expertise: {
      type: [String],
      default: [],
    },

    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    bio: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    professionalProfileUrl: {
      type: String,
      default: "",
      trim: true,
    },

    googleScholarUrl: {
      type: String,
      default: "",
      trim: true,
    },

    researchGateUrl: {
      type: String,
      default: "",
      trim: true,
    },

    linkedinUrl: {
      type: String,
      default: "",
      trim: true,
    },

    orcidUrl: {
      type: String,
      default: "",
      trim: true,
    },

    scopusUrl: {
      type: String,
      default: "",
      trim: true,
    },

    webOfScienceUrl: {
      type: String,
      default: "",
      trim: true,
    },

    personalWebsiteUrl: {
      type: String,
      default: "",
      trim: true,
    },

    biographyUrl: {
      type: String,
      default: "",
      trim: true,
    },

    professionalProfileLabel: {
      type: String,
      default: "",
      trim: true,
    },

    biographyLabel: {
      type: String,
      default: "View Full Biography",
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
  {
    timestamps: true,
  }
);

editorialBoardSchema.index({ category: 1, editorialArea: 1, order: 1 });
editorialBoardSchema.index({
  name: "text",
  institution: "text",
  department: "text",
  editorialArea: "text",
});

const EditorialBoard: Model<IEditorialBoard> =
  mongoose.models.EditorialBoard ||
  mongoose.model<IEditorialBoard>("EditorialBoard", editorialBoardSchema);

export default EditorialBoard;
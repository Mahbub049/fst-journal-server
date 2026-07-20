import mongoose, { Document, Model, Schema } from "mongoose";

export interface IEditorialCategorySetting {
  name: string;
  description: string;
  order: number;
  isActive: boolean;
  showInSummary: boolean;
}

export interface IEditorialAreaSetting {
  name: string;
  description: string;
  order: number;
  isActive: boolean;
}

export interface IEditorialBoardPage extends Document {
  showEyebrow: boolean;
  eyebrow: string;
  pageTitle: string;
  intro: string;
  summaryEyebrow: string;
  summaryTitle: string;
  summaryDescription: string;
  chiefEditorResponsibilityTitle: string;
  chiefEditorResponsibilityDescription: string;
  showSummaryCards: boolean;
  showTotalCard: boolean;
  editorialOfficeTitle: string;
  editorialOfficeDescription: string;
  editorialOfficePublisher: string;
  editorialOfficeInstitution: string;
  editorialOfficeAddress: string;
  editorialOfficeEmail: string;
  editorialOfficePhone: string;
  categories: IEditorialCategorySetting[];
  editorialAreas: IEditorialAreaSetting[];
}

const categorySchema = new Schema<IEditorialCategorySetting>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    showInSummary: { type: Boolean, default: true },
  },
  { _id: true }
);

const areaSchema = new Schema<IEditorialAreaSetting>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const editorialBoardPageSchema = new Schema<IEditorialBoardPage>(
  {
    showEyebrow: { type: Boolean, default: true },
    eyebrow: { type: String, default: "Editorial Leadership", trim: true },
    pageTitle: { type: String, default: "Editorial Board", trim: true },
    intro: {
      type: String,
      default:
        "The editorial board of BUP Faculty of Science and Technology Journal supports academic quality, publication ethics, manuscript evaluation, and scholarly direction.",
    },
    summaryEyebrow: { type: String, default: "Board Summary", trim: true },
    summaryTitle: {
      type: String,
      default: "Editorial Review Structure",
      trim: true,
    },
    summaryDescription: {
      type: String,
      default:
        "Members are organized according to the official editorial structure and their assigned roles.",
    },
    chiefEditorResponsibilityTitle: {
      type: String,
      default: "Chief Editor Responsibilities",
      trim: true,
    },
    chiefEditorResponsibilityDescription: {
      type: String,
      default:
        "Our chief editor is accountable for the overall direction of the journal, ensuring that published work is of the highest quality, follows BUP publication policies and procedures, and advances the journal's editorial mission.",
    },
    showSummaryCards: { type: Boolean, default: true },
    showTotalCard: { type: Boolean, default: true },
    editorialOfficeTitle: {
      type: String,
      default: "Editorial Office",
      trim: true,
    },
    editorialOfficeDescription: {
      type: String,
      default:
        "For journal-related queries, manuscript preparation, publication information, and author support, please contact the editorial office.",
    },
    editorialOfficePublisher: {
      type: String,
      default: "Faculty of Science & Technology",
      trim: true,
    },
    editorialOfficeInstitution: {
      type: String,
      default: "Bangladesh University of Professionals",
      trim: true,
    },
    editorialOfficeAddress: {
      type: String,
      default: "Mirpur Cantonment, Dhaka - 1216",
      trim: true,
    },
    editorialOfficeEmail: {
      type: String,
      default: "editor.fstjournal@bup.edu.bd",
      trim: true,
      lowercase: true,
    },
    editorialOfficePhone: { type: String, default: "", trim: true },
    categories: ({
      type: [categorySchema],
      default: [
        { name: "Chief Patron", order: 0, isActive: true, showInSummary: true },
        { name: "Chief Editor", order: 1, isActive: true, showInSummary: true },
        { name: "Editor", order: 2, isActive: true, showInSummary: true },
        { name: "Assistant Editor", order: 3, isActive: true, showInSummary: true },
        {
          name: "Editorial Advisory Board",
          order: 4,
          isActive: true,
          showInSummary: true,
        },
      ],
    } as any),
    editorialAreas: ({
      type: [areaSchema],
      default: [
        { name: "Journal Leadership", order: 0, isActive: true },
        { name: "Assistant Editorial Team", order: 1, isActive: true },
        { name: "Editorial Advisory Board", order: 2, isActive: true },
        { name: "General", order: 3, isActive: true },
      ],
    } as any),
  },
  { timestamps: true }
);

const EditorialBoardPage: Model<IEditorialBoardPage> =
  mongoose.models.EditorialBoardPage ||
  mongoose.model<IEditorialBoardPage>(
    "EditorialBoardPage",
    editorialBoardPageSchema
  );

export default EditorialBoardPage;

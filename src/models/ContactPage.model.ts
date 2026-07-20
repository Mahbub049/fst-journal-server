import mongoose, { Document, Model, Schema } from "mongoose";

export interface IContactPage extends Document {
  showEyebrow: boolean;
  eyebrow: string;
  title: string;
  subtitle: string;
  contentTitle: string;
  contentHtml: string;
  officeEyebrow: string;
  officeTitle: string;
  officeDescription: string;
  publishedByLabel: string;
  publishedBy: string;
  institutionLabel: string;
  institution: string;
  addressLabel: string;
  address: string;
  emailLabel: string;
  email: string;
  phoneLabel: string;
  phone: string;
  supportEyebrow: string;
  supportTitle: string;
  supportDescription: string;
  emailButtonLabel: string;
  emailSubject: string;
  isPublished: boolean;
}

const contactPageSchema = new Schema<IContactPage>(
  {
    showEyebrow: { type: Boolean, default: true },
    eyebrow: { type: String, default: "Contact", trim: true },
    title: { type: String, default: "Contact Us", trim: true },
    subtitle: {
      type: String,
      default: "Contact information for journal communication.",
      trim: true,
    },
    contentTitle: { type: String, default: "Contact Us", trim: true },
    contentHtml: {
      type: String,
      default:
        "For journal-related communication, authors and readers may contact the editorial office through journal.fst@bup.edu.bd.",
    },
    officeEyebrow: { type: String, default: "Editorial Office", trim: true },
    officeTitle: { type: String, default: "Editorial Office", trim: true },
    officeDescription: {
      type: String,
      default:
        "For any queries regarding manuscript submission, processing, or publication requirements, please contact the Editorial Office.",
    },
    publishedByLabel: { type: String, default: "Published By", trim: true },
    publishedBy: {
      type: String,
      default: "Journal of Faculty of Science & Technology",
      trim: true,
    },
    institutionLabel: { type: String, default: "Institution", trim: true },
    institution: {
      type: String,
      default: "Bangladesh University of Professionals",
      trim: true,
    },
    addressLabel: { type: String, default: "Address", trim: true },
    address: {
      type: String,
      default: "Mirpur Cantonment, Dhaka - 1216",
      trim: true,
    },
    emailLabel: { type: String, default: "Email", trim: true },
    email: { type: String, default: "editor.fstjournal@bup.edu.bd", trim: true },
    phoneLabel: { type: String, default: "Phone", trim: true },
    phone: { type: String, default: "", trim: true },
    supportEyebrow: { type: String, default: "Office Note", trim: true },
    supportTitle: { type: String, default: "Author Support", trim: true },
    supportDescription: {
      type: String,
      default:
        "For any queries regarding manuscript submission, processing, or publication requirements, please contact the Editorial Office.",
    },
    emailButtonLabel: {
      type: String,
      default: "Email Editorial Office",
      trim: true,
    },
    emailSubject: {
      type: String,
      default: "Journal of FST editorial office inquiry",
      trim: true,
    },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ContactPage: Model<IContactPage> =
  mongoose.models.ContactPage ||
  mongoose.model<IContactPage>("ContactPage", contactPageSchema);

export default ContactPage;

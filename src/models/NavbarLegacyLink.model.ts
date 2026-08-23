import mongoose, { Document, Model, Schema } from "mongoose";

export type NavbarLegacyLinkPosition =
  | "before-search"
  | "between-search-submit"
  | "after-submit";

export interface INavbarLegacyLink extends Document {
  enabled: boolean;
  label: string;
  url: string;
  position: NavbarLegacyLinkPosition;
  openInNewTab: boolean;
}

const navbarLegacyLinkSchema = new Schema<INavbarLegacyLink>(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    label: {
      type: String,
      default: "Old JFST Website",
      trim: true,
    },
    url: {
      type: String,
      default: "https://jfst.bup.edu.bd/index.php/jfst",
      trim: true,
    },
    position: {
      type: String,
      enum: ["before-search", "between-search-submit", "after-submit"],
      default: "between-search-submit",
    },
    openInNewTab: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const NavbarLegacyLink: Model<INavbarLegacyLink> =
  mongoose.models.NavbarLegacyLink ||
  mongoose.model<INavbarLegacyLink>(
    "NavbarLegacyLink",
    navbarLegacyLinkSchema
  );

export default NavbarLegacyLink;

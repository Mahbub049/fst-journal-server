import mongoose, { Document, Model, Schema } from "mongoose";

export type MenuLocation =
  | "main"
  | "about"
  | "issues"
  | "for-authors"
  | "editorial-board"
  | "footer";

export type MenuItemType = "link" | "dropdown" | "button";

export interface IMenu extends Document {
  label: string;
  location: MenuLocation;
  type: MenuItemType;
  url: string;
  parentId?: mongoose.Types.ObjectId | null;
  isExternal: boolean;
  openInNewTab: boolean;
  order: number;
  isActive: boolean;
}

const menuSchema = new Schema<IMenu>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      enum: ["main", "about", "issues", "for-authors", "editorial-board", "footer"],
      required: true,
      default: "main",
    },

    type: {
      type: String,
      enum: ["link", "dropdown", "button"],
      required: true,
      default: "link",
    },

    url: {
      type: String,
      trim: true,
      default: "",
    },

    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      default: null,
    },

    isExternal: {
      type: Boolean,
      default: false,
    },

    openInNewTab: {
      type: Boolean,
      default: false,
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

menuSchema.index({ location: 1, order: 1 });
menuSchema.index({ parentId: 1, order: 1 });

const Menu: Model<IMenu> =
  mongoose.models.Menu || mongoose.model<IMenu>("Menu", menuSchema);

export default Menu;
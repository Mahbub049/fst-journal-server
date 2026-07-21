import CallForPaper from "../models/CallForPaper.model";
import Homepage from "../models/Homepage.model";
import Menu from "../models/Menu.model";
import Page, { PageGroup } from "../models/Page.model";
import SiteSettings from "../models/SiteSettings.model";
import SystemState from "../models/SystemState.model";
import { seedHomepage } from "./seedHomepage";
import { seedMenus } from "./seedMenus";
import { seedPages } from "./seedPages";
import { seedSiteSettings } from "./seedSiteSettings";

const INITIAL_PAGE_SEED_KEY = "initial-page-seed-v1";
const INITIAL_MENU_SEED_KEY = "initial-menu-seed-v1";
const INITIAL_SITE_SETTINGS_SEED_KEY = "initial-site-settings-seed-v1";


const replaceLegacyAuthorsNaming = (value: unknown): unknown => {
  if (typeof value === "string") {
    if (value === "for-authors") return "authors";

    return value
      .replace(/\/for-authors(?=\/|$)/g, "/authors")
      .replace(/\bFor Authors\b/g, "Authors");
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceLegacyAuthorsNaming(item));
  }

  if (
    value &&
    typeof value === "object" &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        replaceLegacyAuthorsNaming(item),
      ])
    );
  }

  return value;
};

const migrateAuthorsNaming = async () => {
  const collections = [Page, Menu, SiteSettings, Homepage, CallForPaper];
  let updatedCount = 0;

  for (const model of collections) {
    const documents = await model.collection.find({}).toArray();

    for (const document of documents) {
      const migrated = replaceLegacyAuthorsNaming(document) as Record<
        string,
        unknown
      >;

      if (JSON.stringify(migrated) === JSON.stringify(document)) continue;

      const { _id, ...updates } = migrated;
      await model.collection.updateOne({ _id: document._id }, { $set: updates });
      updatedCount += 1;
    }
  }

  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} CMS document(s) to the Authors naming.`);
  }
};

const normalizeLabel = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");

const getPublicPageUrl = (group: PageGroup, slug: string) => {
  if (group === "about" && slug === "contact-us") return "/contact";
  if (group === "about") return `/about/${slug}`;
  if (group === "authors") return `/authors/${slug}`;
  if (group === "reviewers") return `/reviewers/${slug}`;
  if (group === "issues") return `/issues/${slug}`;
  return `/${slug}`;
};

const getMenuLocationForPageGroup = (group: PageGroup) => {
  if (
    group === "about" ||
    group === "authors" ||
    group === "reviewers" ||
    group === "issues"
  ) {
    return group;
  }

  return null;
};

const markSeedComplete = async (key: string) => {
  await SystemState.updateOne(
    { key },
    { $setOnInsert: { key, completedAt: new Date() } },
    { upsert: true }
  );
};

const runSeedOnce = async (
  key: string,
  hasExistingData: () => Promise<boolean>,
  seed: () => Promise<void>
) => {
  const alreadyCompleted = await SystemState.exists({ key });
  if (alreadyCompleted) return;

  const existingData = await hasExistingData();
  if (!existingData) {
    await seed();
  }

  await markSeedComplete(key);
};

const normalizePageOrders = async (groups: Set<PageGroup>) => {
  for (const group of groups) {
    const pages = await Page.find({ group })
      .sort({ order: 1, createdAt: 1, title: 1 })
      .select("_id");

    if (!pages.length) continue;

    await Page.bulkWrite(
      pages.map((page, index) => ({
        updateOne: {
          filter: { _id: page._id },
          update: { $set: { order: index } },
        },
      }))
    );
  }
};

const cleanupDuplicatePages = async () => {
  const pages = await Page.find().sort({ createdAt: 1, _id: 1 });
  const groupedPages = new Map<string, any[]>();

  pages.forEach((page: any) => {
    const key = `${page.group}:${normalizeLabel(page.title)}`;
    const current = groupedPages.get(key) || [];
    current.push(page);
    groupedPages.set(key, current);
  });

  const touchedGroups = new Set<PageGroup>();
  let removedCount = 0;

  for (const duplicates of groupedPages.values()) {
    if (duplicates.length < 2) continue;

    // Keep the oldest record because it is normally the page already managed by
    // the administrator. The later copy is usually the page recreated by an old
    // startup seed after the original page had already existed.
    const [keeper, ...recordsToRemove] = duplicates;
    const keeperUrl = getPublicPageUrl(keeper.group, keeper.slug);
    const menuLocation = getMenuLocationForPageGroup(keeper.group);

    for (const duplicate of recordsToRemove) {
      const duplicateUrl = getPublicPageUrl(duplicate.group, duplicate.slug);

      await Menu.updateMany(
        { url: duplicateUrl },
        { $set: { url: keeperUrl, label: keeper.title } }
      );

      if (menuLocation) {
        await Menu.updateMany(
          {
            location: menuLocation,
            label: duplicate.title,
          },
          { $set: { url: keeperUrl, label: keeper.title } }
        );
      }

      await Page.deleteOne({ _id: duplicate._id });
      removedCount += 1;
      touchedGroups.add(keeper.group as PageGroup);
    }
  }

  await normalizePageOrders(touchedGroups);

  if (removedCount > 0) {
    console.log(`Removed ${removedCount} duplicate CMS page(s).`);
  }
};

const normalizeMenuOrders = async (placementKeys: Set<string>) => {
  for (const placementKey of placementKeys) {
    const [location, parentIdValue] = placementKey.split("::");
    const parentId = parentIdValue === "root" ? null : parentIdValue;

    const menus = await Menu.find({ location, parentId })
      .sort({ order: 1, createdAt: 1, label: 1 })
      .select("_id");

    if (!menus.length) continue;

    await Menu.bulkWrite(
      menus.map((menu, index) => ({
        updateOne: {
          filter: { _id: menu._id },
          update: { $set: { order: index } },
        },
      }))
    );
  }
};

const cleanupDuplicateMenus = async () => {
  const menus = await Menu.find().sort({ createdAt: 1, _id: 1 });
  const groupedMenus = new Map<string, any[]>();

  menus.forEach((menu: any) => {
    const parentKey = menu.parentId ? String(menu.parentId) : "root";
    const key = `${menu.location}:${parentKey}:${normalizeLabel(menu.label)}`;
    const current = groupedMenus.get(key) || [];
    current.push(menu);
    groupedMenus.set(key, current);
  });

  const touchedPlacements = new Set<string>();
  let removedCount = 0;

  for (const duplicates of groupedMenus.values()) {
    if (duplicates.length < 2) continue;

    const [keeper, ...recordsToRemove] = duplicates;

    for (const duplicate of recordsToRemove) {
      await Menu.updateMany(
        { parentId: duplicate._id },
        { $set: { parentId: keeper._id } }
      );
      await Menu.deleteOne({ _id: duplicate._id });
      removedCount += 1;
    }

    touchedPlacements.add(
      `${keeper.location}::${keeper.parentId ? String(keeper.parentId) : "root"}`
    );
  }

  await normalizeMenuOrders(touchedPlacements);

  if (removedCount > 0) {
    console.log(`Removed ${removedCount} duplicate menu item(s).`);
  }
};

export const bootstrapCms = async () => {
  await migrateAuthorsNaming();

  await runSeedOnce(
    INITIAL_PAGE_SEED_KEY,
    async () => Boolean(await Page.exists({})),
    seedPages
  );

  await runSeedOnce(
    INITIAL_MENU_SEED_KEY,
    async () => Boolean(await Menu.exists({})),
    seedMenus
  );

  await runSeedOnce(
    INITIAL_SITE_SETTINGS_SEED_KEY,
    async () => Boolean(await SiteSettings.exists({})),
    seedSiteSettings
  );

  // Homepage seeding already creates data only when no homepage document exists.
  await seedHomepage();

  // These checks are idempotent and safely remove legacy duplicates that were
  // created by the previous repeat-on-startup seed behavior.
  await cleanupDuplicatePages();
  await cleanupDuplicateMenus();
};

import Menu, { MenuItemType, MenuLocation } from "../models/Menu.model";

type RootMenuDefinition = {
  label: string;
  location: MenuLocation;
  type: MenuItemType;
  url: string;
  order: number;
  isActive: boolean;
  isExternal?: boolean;
  openInNewTab?: boolean;
};

type ChildMenuDefinition = RootMenuDefinition & {
  parentLabel: string;
};

const submitManuscriptUrl = "https://jfst.bup.edu.bd/index.php/jfst/login";

const rootMenus: RootMenuDefinition[] = [
  {
    label: "Home",
    location: "main",
    type: "link",
    url: "/",
    order: 1,
    isActive: true,
  },
  {
    label: "About",
    location: "main",
    type: "dropdown",
    url: "/about/about-the-journal",
    order: 2,
    isActive: true,
  },
  {
    label: "Issues",
    location: "main",
    type: "dropdown",
    url: "/issues/archive",
    order: 3,
    isActive: true,
  },
  {
    label: "Editorial Board",
    location: "main",
    type: "dropdown",
    url: "/editorial-board",
    order: 4,
    isActive: true,
  },
  {
    label: "For Authors",
    location: "main",
    type: "dropdown",
    url: "/for-authors/author-guidelines",
    order: 5,
    isActive: true,
  },
  {
    label: "Call for Papers",
    location: "main",
    type: "button",
    url: "/call-for-papers",
    order: 6,
    isActive: true,
  },
  {
    label: "Submit Manuscript",
    location: "main",
    type: "button",
    url: submitManuscriptUrl,
    order: 7,
    isActive: true,
    isExternal: true,
    openInNewTab: true,
  },
];

const childMenus: ChildMenuDefinition[] = [
  {
    parentLabel: "About",
    label: "About the Journal",
    location: "about",
    type: "link",
    url: "/about/about-the-journal",
    order: 1,
    isActive: true,
  },
  {
    parentLabel: "About",
    label: "Aims & Scope",
    location: "about",
    type: "link",
    url: "/about/aims-scope",
    order: 2,
    isActive: true,
  },
  {
    parentLabel: "About",
    label: "Policies & Ethics",
    location: "about",
    type: "link",
    url: "/about/policies-ethics",
    order: 3,
    isActive: true,
  },
  {
    parentLabel: "About",
    label: "Open Access Statement",
    location: "about",
    type: "link",
    url: "/about/open-access-statement",
    order: 4,
    isActive: true,
  },
  {
    parentLabel: "About",
    label: "Abstracting & Indexing",
    location: "about",
    type: "link",
    url: "/about/abstracting-indexing",
    order: 5,
    isActive: true,
  },
  {
    parentLabel: "About",
    label: "Contact Us",
    location: "about",
    type: "link",
    url: "/contact",
    order: 6,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "Volume 03, Issue 01, July 2025",
    location: "issues",
    type: "link",
    url: "/issues/volume-03-issue-01-july-2025",
    order: 1,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "Volume 02, Issue 01, July 2023",
    location: "issues",
    type: "link",
    url: "/issues/volume-02-issue-01-july-2023",
    order: 2,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "Volume 01, Issue 01, July 2022",
    location: "issues",
    type: "link",
    url: "/issues/volume-01-issue-01-july-2022",
    order: 3,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "All Issues / Archive",
    location: "issues",
    type: "link",
    url: "/issues/archive",
    order: 4,
    isActive: true,
  },
  {
    parentLabel: "Editorial Board",
    label: "Chief Patron",
    location: "editorial-board",
    type: "link",
    url: "/editorial-board#chief-patron",
    order: 1,
    isActive: true,
  },
  {
    parentLabel: "Editorial Board",
    label: "Chief Editor",
    location: "editorial-board",
    type: "link",
    url: "/editorial-board#chief-editor",
    order: 2,
    isActive: true,
  },
  {
    parentLabel: "Editorial Board",
    label: "Editor",
    location: "editorial-board",
    type: "link",
    url: "/editorial-board#editor",
    order: 3,
    isActive: true,
  },
  {
    parentLabel: "Editorial Board",
    label: "Assistant Editors",
    location: "editorial-board",
    type: "link",
    url: "/editorial-board#assistant-editors",
    order: 4,
    isActive: true,
  },
  {
    parentLabel: "Editorial Board",
    label: "Editorial Advisory Board",
    location: "editorial-board",
    type: "link",
    url: "/editorial-board#editorial-advisory-board",
    order: 5,
    isActive: true,
  },
  {
    parentLabel: "For Authors",
    label: "Author Guidelines",
    location: "for-authors",
    type: "link",
    url: "/for-authors/author-guidelines",
    order: 1,
    isActive: true,
  },
  {
    parentLabel: "For Authors",
    label: "Submission Guidelines",
    location: "for-authors",
    type: "link",
    url: "/for-authors/submission-guidelines",
    order: 2,
    isActive: true,
  },
  {
    parentLabel: "For Authors",
    label: "Peer Review Process",
    location: "for-authors",
    type: "link",
    url: "/for-authors/peer-review-process",
    order: 3,
    isActive: true,
  },
  {
    parentLabel: "For Authors",
    label: "Article Processing Charge",
    location: "for-authors",
    type: "link",
    url: "/for-authors/article-processing-charge",
    order: 4,
    isActive: true,
  },
  {
    parentLabel: "For Authors",
    label: "Copyright & Licensing",
    location: "for-authors",
    type: "link",
    url: "/for-authors/copyright-licensing",
    order: 5,
    isActive: true,
  },
  {
    parentLabel: "For Authors",
    label: "Templates",
    location: "for-authors",
    type: "link",
    url: "/for-authors/templates",
    order: 6,
    isActive: true,
  },
];

const findExistingRootMenu = async (menu: RootMenuDefinition) => {
  return Menu.findOne({
    label: menu.label,
    location: "main",
    $or: [{ parentId: null }, { parentId: { $exists: false } }],
  }).sort({ createdAt: 1 });
};

const cleanupDuplicateRootMenus = async (menu: RootMenuDefinition) => {
  const duplicateRoots = await Menu.find({
    label: menu.label,
    location: "main",
    $or: [{ parentId: null }, { parentId: { $exists: false } }],
  }).sort({ createdAt: 1 });

  if (duplicateRoots.length <= 1) return duplicateRoots[0] || null;

  const [keeper, ...duplicates] = duplicateRoots;
  const duplicateIds = duplicates.map((duplicate: any) => duplicate._id);

  await Menu.updateMany(
    { parentId: { $in: duplicateIds } },
    { $set: { parentId: keeper._id } }
  );

  await Menu.deleteMany({ _id: { $in: duplicateIds } });

  return keeper;
};

const cleanupDuplicateChildMenus = async (parentId: any, menu: ChildMenuDefinition) => {
  const duplicateChildren = await Menu.find({
    label: menu.label,
    parentId,
  }).sort({ createdAt: 1 });

  if (duplicateChildren.length <= 1) return duplicateChildren[0] || null;

  const [keeper, ...duplicates] = duplicateChildren;

  await Menu.deleteMany({
    _id: { $in: duplicates.map((duplicate: any) => duplicate._id) },
  });

  return keeper;
};

const cleanupStaleChildMenus = async (parentId: any, allowedLabels: string[]) => {
  await Menu.deleteMany({
    parentId,
    label: { $nin: allowedLabels },
  });
};

const applyRootDefaults = async (existingMenu: any, menu: RootMenuDefinition) => {
  let changed = false;

  const updates: Partial<RootMenuDefinition> & { parentId?: null } = {
    location: menu.location,
    type: menu.type,
    order: menu.order,
    isActive: existingMenu.isActive ?? menu.isActive,
    parentId: null,
  };

  Object.entries(updates).forEach(([key, value]) => {
    if (existingMenu[key] !== value) {
      existingMenu[key] = value;
      changed = true;
    }
  });

  if (!existingMenu.url) {
    existingMenu.url = menu.url;
    changed = true;
  }

  if (menu.label === "Submit Manuscript") {
    const oldLocalUrl = "/for-authors/submission-guidelines";

    if (!existingMenu.url || existingMenu.url === oldLocalUrl) {
      existingMenu.url = submitManuscriptUrl;
      changed = true;
    }

    if (existingMenu.isExternal !== true) {
      existingMenu.isExternal = true;
      changed = true;
    }

    if (existingMenu.openInNewTab !== true) {
      existingMenu.openInNewTab = true;
      changed = true;
    }
  } else {
    if (typeof existingMenu.isExternal !== "boolean") {
      existingMenu.isExternal = menu.isExternal ?? false;
      changed = true;
    }

    if (typeof existingMenu.openInNewTab !== "boolean") {
      existingMenu.openInNewTab = menu.openInNewTab ?? false;
      changed = true;
    }
  }

  if (changed) await existingMenu.save();
};

const applyChildDefaults = async (existingMenu: any, menu: ChildMenuDefinition, parentId: any) => {
  let changed = false;

  const updates = {
    location: menu.location,
    type: menu.type,
    url: menu.url,
    order: menu.order,
    parentId,
    isExternal: menu.isExternal ?? false,
    openInNewTab: menu.openInNewTab ?? false,
  };

  Object.entries(updates).forEach(([key, value]) => {
    const currentValue = key === "parentId" ? String(existingMenu[key] || "") : existingMenu[key];
    const nextValue = key === "parentId" ? String(value || "") : value;

    if (currentValue !== nextValue) {
      existingMenu[key] = value;
      changed = true;
    }
  });

  if (typeof existingMenu.isActive !== "boolean") {
    existingMenu.isActive = menu.isActive;
    changed = true;
  }

  if (changed) await existingMenu.save();
};

export const seedMenus = async () => {
  const rootMap = new Map<string, any>();

  for (const menu of rootMenus) {
    let existingMenu = await cleanupDuplicateRootMenus(menu);

    if (!existingMenu) {
      existingMenu = await findExistingRootMenu(menu);
    }

    if (existingMenu) {
      await applyRootDefaults(existingMenu, menu);
      rootMap.set(menu.label, existingMenu);
      continue;
    }

    const createdMenu = await Menu.create({
      ...menu,
      isExternal: menu.isExternal ?? false,
      openInNewTab: menu.openInNewTab ?? false,
      parentId: null,
    });

    rootMap.set(menu.label, createdMenu);
  }

  const childMenusByParent = new Map<string, ChildMenuDefinition[]>();

  childMenus.forEach((menu) => {
    const current = childMenusByParent.get(menu.parentLabel) || [];
    current.push(menu);
    childMenusByParent.set(menu.parentLabel, current);
  });

  for (const [parentLabel, menus] of childMenusByParent.entries()) {
    const parentMenu = rootMap.get(parentLabel);
    if (!parentMenu) continue;

    await cleanupStaleChildMenus(
      parentMenu._id,
      menus.map((menu) => menu.label)
    );

    for (const menu of menus) {
      let existingMenu = await cleanupDuplicateChildMenus(parentMenu._id, menu);

      if (!existingMenu) {
        existingMenu = await Menu.findOne({
          label: menu.label,
          parentId: parentMenu._id,
        }).sort({ createdAt: 1 });
      }

      if (existingMenu) {
        await applyChildDefaults(existingMenu, menu, parentMenu._id);
        continue;
      }

      const { parentLabel: _, ...menuPayload } = menu;

      await Menu.create({
        ...menuPayload,
        isExternal: menu.isExternal ?? false,
        openInNewTab: menu.openInNewTab ?? false,
        parentId: parentMenu._id,
      });
    }
  }
};

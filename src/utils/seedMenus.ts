import Menu, { MenuItemType, MenuLocation } from "../models/Menu.model";

type RootMenuDefinition = {
  label: string;
  location: MenuLocation;
  type: MenuItemType;
  url: string;
  order: number;
  isActive: boolean;
};

type ChildMenuDefinition = RootMenuDefinition & {
  parentLabel: string;
};

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
    url: "",
    order: 2,
    isActive: true,
  },
  {
    label: "Issues",
    location: "main",
    type: "dropdown",
    url: "",
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
    url: "",
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
    url: "/for-authors/submission-guidelines",
    order: 7,
    isActive: true,
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
    label: "Current Issue",
    location: "issues",
    type: "link",
    url: "/issues/current",
    order: 1,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "All Issues / Archive",
    location: "issues",
    type: "link",
    url: "/issues/archive",
    order: 2,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "Special Issues",
    location: "issues",
    type: "link",
    url: "/issues/special",
    order: 3,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "Most Cited",
    location: "issues",
    type: "link",
    url: "/issues/most-cited",
    order: 4,
    isActive: true,
  },
  {
    parentLabel: "Issues",
    label: "Most Read",
    location: "issues",
    type: "link",
    url: "/issues/most-read",
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

const editorialChildUrls = [
  "/editorial-board#chief-patron",
  "/editorial-board#chief-editor",
  "/editorial-board#editor",
  "/editorial-board#assistant-editors",
  "/editorial-board#editorial-advisory-board",
];

const editorialChildLabels = [
  "Chief Patron",
  "Chief Editor",
  "Editor",
  "Assistant Editors",
  "Editorial Advisory Board",
];

const defaultChildUrls = childMenus.map((menu) => menu.url);

const removeDuplicateMenusByUrl = async (url: string) => {
  const duplicatedMenus = await Menu.find({ url }).sort({ createdAt: 1 });

  if (duplicatedMenus.length <= 1) return;

  const [, ...duplicates] = duplicatedMenus;

  await Menu.deleteMany({
    _id: { $in: duplicates.map((menu) => menu._id) },
  });
};

const cleanupWrongMenuData = async () => {
  await Menu.deleteMany({
    url: { $in: editorialChildUrls },
    parentId: { $ne: null },
  });

  await Menu.deleteMany({
    label: { $in: editorialChildLabels },
    location: { $in: ["about", "issues", "for-authors"] },
  });

  await Promise.all(defaultChildUrls.map(removeDuplicateMenusByUrl));
};

const findRootMenu = async (menu: RootMenuDefinition) => {
  if (menu.url) {
    const menuByUrl = await Menu.findOne({
      url: menu.url,
      location: menu.location,
      parentId: null,
    });

    if (menuByUrl) return menuByUrl;
  }

  return Menu.findOne({
    label: menu.label,
    location: menu.location,
    parentId: null,
  });
};

const findChildMenu = async (menu: ChildMenuDefinition) => {
  if (menu.url) {
    const menuByUrl = await Menu.findOne({
      url: menu.url,
    });

    if (menuByUrl) return menuByUrl;
  }

  return Menu.findOne({
    label: menu.label,
    location: menu.location,
  });
};

export const seedMenus = async () => {
  await cleanupWrongMenuData();

  const rootMap = new Map<string, any>();

  for (const menu of rootMenus) {
    const existingMenu = await findRootMenu(menu);

    if (existingMenu) {
      existingMenu.location = menu.location;
      existingMenu.type = menu.type;
      existingMenu.url = menu.url;
      existingMenu.parentId = null;
      existingMenu.order = menu.order;
      await existingMenu.save();

      rootMap.set(menu.label, existingMenu);
      continue;
    }

    const createdMenu = await Menu.create({
      ...menu,
      parentId: null,
    });

    rootMap.set(menu.label, createdMenu);
  }

  for (const menu of childMenus) {
    const parentMenu = rootMap.get(menu.parentLabel);
    if (!parentMenu) continue;

    const existingMenu = await findChildMenu(menu);

    if (existingMenu) {
      existingMenu.location = menu.location;
      existingMenu.type = menu.type;
      existingMenu.url = menu.url;
      existingMenu.parentId = parentMenu._id;
      existingMenu.order = menu.order;
      await existingMenu.save();
      continue;
    }

    const { parentLabel, ...menuPayload } = menu;

    await Menu.create({
      ...menuPayload,
      parentId: parentMenu._id,
    });

    void parentLabel;
  }
};

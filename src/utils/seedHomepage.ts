import Homepage from "../models/Homepage.model";

export const seedHomepage = async () => {
  const existingHomepage = await Homepage.findOne();

  if (existingHomepage) {
    return;
  }

  await Homepage.create({
    heroTitle: "BUP Faculty of Science and Technology Journal",
    heroSubtitle:
      "An academic journal of Bangladesh University of Professionals.",
    journalCoverImage: "/images/journal-cover.jpg",
    publishingModel: "Open Access",
    issnPrint: "Print ISSN",
    issnOnline: "Online ISSN",

    metrics: [
      {
        label: "Cite Score",
        value: "0.0",
        description: "Citation performance indicator",
        order: 1,
        isActive: true,
      },
      {
        label: "Impact",
        value: "Academic",
        description: "Research and scholarly contribution",
        order: 2,
        isActive: true,
      },
      {
        label: "Review Type",
        value: "Peer Reviewed",
        description: "Editorial review process",
        order: 3,
        isActive: true,
      },
    ],

    overviewTitle: "Overview",
    overviewContent:
      "The BUP Faculty of Science and Technology Journal publishes quality research in science, technology, engineering, and related interdisciplinary areas.",

    journalInfoTitle: "Journal Information",
    journalInfoItems: [
      {
        label: "Publisher",
        value: "Bangladesh University of Professionals",
        order: 1,
        isActive: true,
      },
      {
        label: "Publishing Model",
        value: "Open Access",
        order: 2,
        isActive: true,
      },
      {
        label: "Language",
        value: "English",
        order: 3,
        isActive: true,
      },
      {
        label: "Publication Frequency",
        value: "Regular",
        order: 4,
        isActive: true,
      },
    ],

    executiveEditorsTitle: "Executive Editors",
    executiveEditorsSubtitle:
      "Meet the executive editorial members of the journal.",

    articlesSectionTitle: "Articles",
    articlesSectionSubtitle: "Explore recently published articles.",

    recentIssuesTitle: "Recent Issues",
    recentIssuesSubtitle: "Browse the latest published issues of the journal.",

    buttons: [
      {
        label: "View Current Issue",
        url: "/issues/current",
        variant: "primary",
        order: 1,
        isActive: true,
      },
      {
        label: "Author Guidelines",
        url: "/for-authors/author-guidelines",
        variant: "secondary",
        order: 2,
        isActive: true,
      },
    ],

    isPublished: true,
  });

  console.log("Default homepage content seeded.");
};
import Page from "../models/Page.model";

const defaultPages = [
  {
    title: "About the Journal",
    slug: "about-the-journal",
    group: "about",
    subtitle: "Learn about the journal, its scope, and publication focus.",
    order: 1,
    contentBlocks: [
      {
        type: "paragraph",
        title: "About the Journal",
        content:
          "The BUP FST Journal is an academic publication platform for research and scholarly communication.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Aims & Scope",
    slug: "aims-scope",
    group: "about",
    subtitle: "Research areas and academic scope of the journal.",
    order: 2,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Aims & Scope",
        content:
          "This page describes the aims, scope, and subject coverage of the journal.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Policies & Ethics",
    slug: "policies-ethics",
    group: "about",
    subtitle: "Publication ethics, originality, and editorial policies.",
    order: 3,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Policies & Ethics",
        content:
          "This page contains publication ethics, peer review policy, and editorial responsibilities.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Open Access Statement",
    slug: "open-access-statement",
    group: "about",
    subtitle: "Open access policy of the journal.",
    order: 4,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Open Access Statement",
        content:
          "This page explains the open access policy and reader access rights.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Abstracting & Indexing",
    slug: "abstracting-indexing",
    group: "about",
    subtitle: "Indexing and abstracting information.",
    order: 5,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Abstracting & Indexing",
        content:
          "This page lists indexing, abstracting, and database inclusion information.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Contact Us",
    slug: "contact-us",
    group: "about",
    subtitle: "Contact information for journal communication.",
    order: 6,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Contact Us",
        content:
          "This page contains journal contact information and communication details.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Author Guidelines",
    slug: "author-guidelines",
    group: "for-authors",
    subtitle: "Instructions for authors preparing manuscripts.",
    order: 1,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Author Guidelines",
        content:
          "This page contains manuscript preparation instructions for authors.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Submission Guidelines",
    slug: "submission-guidelines",
    group: "for-authors",
    subtitle: "Submission process and required documents.",
    order: 2,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Submission Guidelines",
        content:
          "This page explains manuscript submission requirements and document preparation.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Peer Review Process",
    slug: "peer-review-process",
    group: "for-authors",
    subtitle: "Review process followed by the journal.",
    order: 3,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Peer Review Process",
        content:
          "This page describes the peer review process followed by the journal.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Article Processing Charge",
    slug: "article-processing-charge",
    group: "for-authors",
    subtitle: "Information about article processing charges.",
    order: 4,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Article Processing Charge",
        content:
          "This page contains information about article processing charges, if applicable.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Copyright & Licensing",
    slug: "copyright-licensing",
    group: "for-authors",
    subtitle: "Copyright, licensing, and author rights.",
    order: 5,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Copyright & Licensing",
        content:
          "This page explains copyright, licensing, and author rights.",
        order: 1,
        isActive: true,
      },
    ],
  },
  {
    title: "Templates",
    slug: "templates",
    group: "for-authors",
    subtitle: "Download author templates and related files.",
    order: 6,
    contentBlocks: [
      {
        type: "paragraph",
        title: "Templates",
        content:
          "This page provides downloadable templates and author resources.",
        order: 1,
        isActive: true,
      },
    ],
  },
];

export const seedPages = async () => {
  for (const pageData of defaultPages) {
    const existingPage = await Page.findOne({
      group: pageData.group,
      slug: pageData.slug,
    });

    if (!existingPage) {
      await Page.create({
        ...pageData,
        isPublished: true,
      });
    }
  }

  console.log("Default pages checked.");
};
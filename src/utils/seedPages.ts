import Page from "../models/Page.model";

const oldSeedContents = new Set([
  "The BUP FST Journal is an academic publication platform for research and scholarly communication.",
  "This page describes the aims, scope, and subject coverage of the journal.",
  "This page contains publication ethics, peer review policy, and editorial responsibilities.",
  "This page explains the open access policy and reader access rights.",
  "This page lists indexing, abstracting, and database inclusion information.",
  "This page contains journal contact information and communication details.",
  "This page contains manuscript preparation instructions for authors.",
  "This page explains manuscript submission requirements and document preparation.",
  "This page describes the peer review process followed by the journal.",
  "This page contains information about article processing charges, if applicable.",
  "This page explains copyright, licensing, and author rights.",
  "This page provides downloadable templates and author resources.",
]);

const paragraphBlock = (title: string, content: string, order: number) => ({
  type: "paragraph",
  title,
  content,
  order,
  isActive: true,
});

const listBlock = (title: string, items: string[], order: number) => ({
  type: "list",
  title,
  items,
  order,
  isActive: true,
});

const defaultPages = [
  {
    title: "About the Journal",
    slug: "about-the-journal",
    group: "about",
    subtitle:
      "A peer-reviewed academic journal of the Faculty of Science & Technology, Bangladesh University of Professionals.",
    order: 1,
    contentBlocks: [
      paragraphBlock(
        "",
        "BUP Faculty of Science & Technology Journal is an academic publication platform dedicated to high-quality research in science, technology, engineering, computing, and interdisciplinary fields.",
        1
      ),
      paragraphBlock(
        "",
        "The journal encourages original research articles, review papers, technical notes, and scholarly discussions that contribute to academic knowledge and practical problem solving.",
        2
      ),
      paragraphBlock(
        "",
        "It aims to support researchers, faculty members, students, and professionals by providing a reliable platform for research publication and academic visibility.",
        3
      ),
    ],
  },
  {
    title: "Aims & Scope",
    slug: "aims-scope",
    group: "about",
    subtitle:
      "The journal publishes research across science, technology, engineering, and interdisciplinary domains.",
    order: 2,
    contentBlocks: [
      paragraphBlock(
        "",
        "The aim of the journal is to promote scholarly communication and research excellence in science and technology-based disciplines.",
        1
      ),
      paragraphBlock(
        "",
        "The journal welcomes manuscripts in areas such as computer science, artificial intelligence, data science, software engineering, cybersecurity, environmental science, applied technology, and related interdisciplinary fields.",
        2
      ),
      paragraphBlock(
        "",
        "Submissions should present clear contribution, sound methodology, academic originality, and relevance to current research or practical challenges.",
        3
      ),
    ],
  },
  {
    title: "Policies & Ethics",
    slug: "policies-ethics",
    group: "about",
    subtitle:
      "The journal follows academic integrity, publication ethics, and transparent review standards.",
    order: 3,
    contentBlocks: [
      paragraphBlock(
        "",
        "Authors are expected to submit original work that has not been published or submitted elsewhere at the same time.",
        1
      ),
      paragraphBlock(
        "",
        "All manuscripts should follow ethical research practices, proper citation standards, and responsible authorship guidelines.",
        2
      ),
      paragraphBlock(
        "",
        "The journal does not tolerate plagiarism, duplicate submission, data fabrication, or unethical publication behavior.",
        3
      ),
    ],
  },
  {
    title: "Open Access Statement",
    slug: "open-access-statement",
    group: "about",
    subtitle:
      "The journal supports accessible scholarly communication and research visibility.",
    order: 4,
    contentBlocks: [
      paragraphBlock(
        "",
        "BUP Faculty of Science & Technology Journal supports open academic communication by making published research accessible to readers.",
        1
      ),
      paragraphBlock(
        "",
        "Open Access helps increase research visibility, supports knowledge sharing, and allows researchers, students, and professionals to benefit from scholarly work.",
        2
      ),
      paragraphBlock(
        "",
        "Authors should follow the journal’s copyright and licensing guidelines before publication.",
        3
      ),
    ],
  },
  {
    title: "Abstracting & Indexing",
    slug: "abstracting-indexing",
    group: "about",
    subtitle:
      "Indexing information and database coverage will be updated as the journal develops.",
    order: 5,
    contentBlocks: [
      paragraphBlock(
        "",
        "The journal aims to improve discoverability through academic indexing, abstracting services, and research databases.",
        1
      ),
      paragraphBlock(
        "",
        "Indexing information will be updated as the journal expands its publication profile and fulfills relevant database requirements.",
        2
      ),
      paragraphBlock(
        "",
        "Researchers are encouraged to cite published articles properly to improve academic reach and visibility.",
        3
      ),
    ],
  },
  {
    title: "Contact Us",
    slug: "contact-us",
    group: "about",
    subtitle: "Contact information for journal communication.",
    order: 6,
    contentBlocks: [
      paragraphBlock(
        "Contact Us",
        "For journal-related communication, authors and readers may contact the editorial office through journal.fst@bup.edu.bd.",
        1
      ),
    ],
  },
  {
    title: "Author Guidelines",
    slug: "author-guidelines",
    group: "for-authors",
    subtitle:
      "Detailed instructions for preparing manuscripts for the BUP Faculty of Science and Technology Journal.",
    order: 1,
    contentBlocks: [
      paragraphBlock(
        "Before the Beginning",
        "Authors are requested to carefully review the journal guidelines and manuscript template before submission. All necessary information will be available at the official website of Bangladesh University of Professionals through the journal section.",
        1
      ),
      listBlock(
        "Manuscript Structure",
        [
          "Title page with title of the study, corresponding author details, and co-author details.",
          "Abstract with a maximum of 250 words.",
          "Maximum 6 keywords.",
          "Main body including Introduction, Methodology, Result and Discussion, and Conclusion.",
          "References following APA 7 format or the latest edition.",
          "All figures with relevant captions.",
          "All tables including titles, descriptions, and footnotes.",
          "Indicate clearly if colour should be used for any figures in print.",
          "Graphical abstract or highlights file, where applicable.",
          "Page limit: maximum 20 pages.",
          "Plagiarism should be less than 20%.",
          "Supplementary files, where applicable.",
        ],
        2
      ),
      paragraphBlock(
        "Language and Formatting",
        "The manuscript should be spell-checked and grammar-checked before submission. Authors should write clearly, concisely, and avoid overly long articles. The manuscript should follow the journal template and accepted academic formatting standards.",
        3
      ),
      paragraphBlock(
        "Ethical Responsibility",
        "Authors must ensure that the manuscript is original, has not been published previously, and is not under consideration for publication elsewhere. Permission must be obtained for the use of copyrighted materials from other sources, including internet sources.",
        4
      ),
    ],
  },
  {
    title: "Submission Guidelines",
    slug: "submission-guidelines",
    group: "for-authors",
    subtitle:
      "Submission instructions, required documents, and communication process for authors.",
    order: 2,
    contentBlocks: [
      paragraphBlock(
        "Submission Email",
        "Authors should send their manuscripts and required documents to the official journal email address: journal.fst@bup.edu.bd.",
        1
      ),
      listBlock(
        "Submission Checklist",
        [
          "One author must be designated as the corresponding author.",
          "Corresponding author contact details must include email address and full postal address.",
          "The manuscript must include title page, abstract, keywords, main body, references, tables, figures, and supplementary files where applicable.",
          "The manuscript should follow the template provided on the journal website.",
          "The manuscript should be checked for spelling and grammar before submission.",
          "A declaration of conflict of interest should be included.",
        ],
        2
      ),
      paragraphBlock(
        "Communication Process",
        "All correspondence, including notification of the editor's decisions and requests for revision, will be sent by email. Authors should keep their contact information updated during the full submission and review process.",
        3
      ),
      paragraphBlock(
        "Submission Deadline",
        "The last date of manuscript submission for the current issue is 30th November 2026.",
        4
      ),
    ],
  },
  {
    title: "Peer Review Process",
    slug: "peer-review-process",
    group: "for-authors",
    subtitle: "The editorial board reviews submitted manuscripts before publication.",
    order: 3,
    contentBlocks: [
      paragraphBlock(
        "Editorial Screening",
        "After submission, the editorial office checks whether the manuscript follows the journal scope, formatting rules, required structure, plagiarism limit, and ethical requirements.",
        1
      ),
      paragraphBlock(
        "Originality Checking",
        "For verifying originality, the article may be checked by an originality detection service or similarity checker.",
        2
      ),
      paragraphBlock(
        "Review and Decision",
        "The editorial board reviews the submitted manuscripts and makes publication decisions based on quality, originality, relevance, clarity, and compliance with journal guidelines.",
        3
      ),
      paragraphBlock(
        "Revision Communication",
        "If revision is required, authors will receive editorial comments or instructions through email. Revised manuscripts should be submitted according to the instructions provided by the editorial office.",
        4
      ),
    ],
  },
  {
    title: "Article Processing Charge",
    slug: "article-processing-charge",
    group: "for-authors",
    subtitle: "Information about article processing or publication-related charges.",
    order: 4,
    contentBlocks: [
      paragraphBlock(
        "Current Information",
        "The provided journal document does not mention any specific article processing charge. Authors should contact the editorial office for the latest information before submission.",
        1
      ),
      paragraphBlock(
        "Editorial Contact",
        "For updated information regarding submission, processing, or publication-related requirements, authors may contact the journal office through journal.fst@bup.edu.bd.",
        2
      ),
    ],
  },
  {
    title: "Copyright & Licensing",
    slug: "copyright-licensing",
    group: "for-authors",
    subtitle: "Rules regarding originality, copyright permission, and author responsibility.",
    order: 5,
    contentBlocks: [
      paragraphBlock(
        "Original Work Declaration",
        "Submission of an article implies that the work described has not been published previously, is not under consideration for publication elsewhere, and has been approved by all authors and responsible authorities where the work was carried out.",
        1
      ),
      paragraphBlock(
        "Copyright Permission",
        "Authors must obtain permission for the use of copyrighted materials from other sources, including materials collected from the internet.",
        2
      ),
      paragraphBlock(
        "Publication Restriction",
        "If accepted, the article must not be published elsewhere in the same form, in English or in any other language, including electronic versions, without written permission from the copyright holder.",
        3
      ),
      paragraphBlock(
        "Conflict of Interest",
        "Authors should submit a declaration of conflict of interest with the manuscript.",
        4
      ),
    ],
  },
  {
    title: "Templates",
    slug: "templates",
    group: "for-authors",
    subtitle: "Manuscript template and final accepted paper formatting instructions.",
    order: 6,
    contentBlocks: [
      paragraphBlock(
        "Manuscript Template",
        "Authors should follow the official manuscript template provided on the journal website before preparing and submitting their article.",
        1
      ),
      paragraphBlock(
        "Final Accepted Papers",
        "Authors must submit their final accepted articles in both Word and LaTeX formats. All figures must be submitted separately in both colour and grayscale versions.",
        2
      ),
      paragraphBlock(
        "Reference Style",
        "References should follow APA style, preferably APA 7 format or the latest edition recommended by the journal.",
        3
      ),
      paragraphBlock(
        "DOI Information",
        "All finally accepted articles will be provided with a DOI.",
        4
      ),
    ],
  },
];

const shouldRefreshOldDefaultPage = (existingPage: any) => {
  const blocks = existingPage.contentBlocks || [];

  if (blocks.length !== 1) return false;

  const firstContent = blocks[0]?.content || "";
  return oldSeedContents.has(firstContent);
};

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
    } else if (shouldRefreshOldDefaultPage(existingPage)) {
      existingPage.title = pageData.title;
      existingPage.subtitle = pageData.subtitle;
      existingPage.order = pageData.order;
      existingPage.contentBlocks = pageData.contentBlocks as any;
      existingPage.isPublished = true;

      await existingPage.save();
    }
  }

  console.log("Default pages checked.");
};

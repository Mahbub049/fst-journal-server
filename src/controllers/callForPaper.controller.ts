import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import CallForPaper from "../models/CallForPaper.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const DEFAULT_CALL_FOR_PAPER = {
  showInvitationLabel: true,
  invitationLabel: "Publication Invitation",
  title: "Call for Papers",
  subtitle: "",
  descriptionWidth: "normal",
  descriptionAlignment: "justify",
  description:
    "The Faculty of Science and Technology, Bangladesh University of Professionals, invites authors to submit original and high-quality manuscripts for the upcoming issue of the Journal of FST. The journal welcomes research contributions in engineering, computer science, communication technology, environmental science, management, and related interdisciplinary fields.",

  posterImage: "",
  pdfUrl: "/pdfs/call-for-papers.pdf",
  pdfTitle: "Call for Papers Document",
  pdfSubtitle: "Volume 4, Issue 1",
  showPdfActionButton: true,
  pdfActionButtonLabel: "View PDF",
  pdfActionButtonLink: "/pdfs/call-for-papers.pdf",
  showPdfActionButtonIcon: true,
  showEmbeddedPdfViewer: true,

  submissionFormatLabel: "Submission Format",
  submissionFormatTitle: "Types of Manuscripts Accepted",
  submissionFormatDescription:
    "The journal welcomes different types of academic submissions. Manuscripts should present original contribution, clear methodology, proper academic writing, and relevance to the scope of the Faculty of Science and Technology.",
  submissionTypes: [
    "Full research articles",
    "Short communications",
    "Book reviews",
    "Policy analysis",
    "Review articles",
  ],
  submissionTypeDetails: [
    {
      title: "Full research articles",
      description:
        "Complete original studies presenting a clear research problem, methodology, results, analysis, and contribution.",
      order: 1,
      isActive: true,
    },
    {
      title: "Short communications",
      description:
        "Concise reports of significant new findings, methods, or early results that deserve rapid scholarly communication.",
      order: 2,
      isActive: true,
    },
    {
      title: "Book reviews",
      description:
        "Critical and balanced evaluations of recently published academic books relevant to the journal's scope.",
      order: 3,
      isActive: true,
    },
    {
      title: "Policy analysis",
      description:
        "Evidence-based examination of scientific, technological, environmental, or institutional policies and their implications.",
      order: 4,
      isActive: true,
    },
    {
      title: "Review articles",
      description:
        "Structured synthesis and critical assessment of existing literature, trends, gaps, and future research directions.",
      order: 5,
      isActive: true,
    },
  ],

  scopeLabel: "Scope of Submission",
  scopeTitle: "Suggested Research Areas",
  scopeDescription:
    "Authors are encouraged to submit high-quality articles in the areas listed below. The scope covers Electrical and Electronic Engineering, Computer Science and Engineering, Information and Communication Technology, Environmental Science and Management, and other related areas.",
  engineeringTitle: "Engineering, ICT and Computing Areas",
  engineeringTopics: [
    "Electric Power Engineering",
    "Electric Machinery and Power Electronics",
    "Electro Physics and Applications",
    "Electric Material and Semiconductor",
    "High Power, High Voltage and Discharge",
    "Micro-Electro-Mechanical Systems (MEMS)",
    "Nanotechnology",
    "Microwave Engineering",
    "Radar and Satellite Communications",
    "Optical Fiber Communication",
    "Optical and EM Wave",
    "Sensors and Systems",
    "Signal Processing",
    "Robotics, Automation and Control",
    "Application of AI in Smart Education System",
    "Industrial Internet of Things (IIoT)",
    "Mobile Computing for Industry",
    "IoT and WSN for Smart City Applications",
    "Cloud Computing and Networking",
    "Grid and Metering Infrastructure",
    "Smart Transportation System",
    "Big Data and Machine Learning",
    "Natural Language Processing and Text Mining",
    "Data Mining for Biomedical Engineering",
    "Electronic Health Records and Standards",
    "Wearable and Body Implant Technologies",
    "ICT in Telemedicine",
    "Collaborative and Cooperative Education System",
    "Smart Learning System",
    "Cloud-IoT Platforms for Small to Large Scale Farming",
  ],
  environmentalTitle: "Environmental Science and Management Areas",
  environmentalTopics: [
    "Environmental Management",
    "Environmental Pollution and Mitigation",
    "Environmental Chemistry",
    "Environmental Engineering",
    "Environmental Modelling",
    "Environmental Economics",
    "Environmental Technology",
    "Biological Pollution in Environment",
    "Ecology and Biodiversity",
    "Earth Science",
    "Oceanography",
    "Environmental Policy and Governance",
    "Occupational Health and Safety",
    "Integrated Coastal Zone and Floodplain Management",
    "Climate Change Adaptation and Mitigation",
    "Disaster Risk Reduction and Disaster Management",
    "Sustainable Urban Planning and Development",
    "Sustainable Energy Management",
    "Agriculture and Environment",
  ],

  finalSectionLabel: "Final Accepted Papers",
  finalSectionTitle: "Final Submission Requirements",
  finalSectionDescription:
    "Authors must submit the final accepted article in both Word and LaTeX format. All figures should be submitted separately in both colour and grayscale versions. All finally accepted articles will be provided with a DOI.",

  importantInfoLabel: "Important Information",
  timelineTitle: "Current Issue Timeline",
  importantDates: [
    {
      label: "Manuscript Submission Deadline",
      date: "30 November 2026",
      order: 1,
      isActive: true,
    },
    {
      label: "Issue",
      date: "Volume 4, Issue 1",
      order: 2,
      isActive: true,
    },
    {
      label: "Publication Year",
      date: "2026",
      order: 3,
      isActive: true,
    },
    {
      label: "Submission Email",
      date: "journal.fst@bup.edu.bd",
      order: 4,
      isActive: true,
    },
  ],

  submitSectionLabel: "Submit Manuscript",
  submitTitle: "Ready to submit?",
  submitDescription:
    "Please review the author guidelines, manuscript structure, word limit, plagiarism requirement, and formatting rules before submission.",
  submissionButtonLabel: "Email Manuscript",
  submissionButtonLink: "mailto:journal.fst@bup.edu.bd",
  guidelinesButtonLabel: "View Submission Guidelines",
  guidelinesButtonLink: "/authors/submission-guidelines",

  contactSectionLabel: "Contact",
  contactTitle: "Editorial Office",
  contactEditorLabel: "Chief Editor",
  contactEditorName: "Brigadier General Sufi Md Ataur Rahman, ndc, psc",
  publishedByLabel: "Published By",
  publishedBy: "Faculty of Science and Technology",
  publisherName: "Bangladesh University of Professionals",
  publisherAddress: "Mirpur Cantonment, Dhaka - 1216",
  contactEmail: "journal.fst@bup.edu.bd",
  contactPhone: "",
  publisherInfo: "Bangladesh University of Professionals",

  isPublished: true,
};

const normalizeString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeOptionalString = (value: unknown, fallback = "") => {
  if (typeof value !== "string") return fallback;
  return value.trim();
};

const sanitizeHtml = (value: unknown, fallback = "") => {
  const html = normalizeOptionalString(value, fallback);
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "");
};

const normalizeDescriptionWidth = (value: unknown) =>
  value === "full" ? "full" : "normal";

const normalizeTextAlignment = (value: unknown) =>
  ["left", "center", "right", "justify"].includes(String(value))
    ? String(value)
    : "justify";

const normalizeStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const normalizeSubmissionTypeDetails = (
  value: unknown,
  legacyValue: unknown
) => {
  const source =
    Array.isArray(value) && value.length > 0
      ? value
      : Array.isArray(legacyValue)
        ? legacyValue
        : Array.isArray(value)
          ? value
          : DEFAULT_CALL_FOR_PAPER.submissionTypeDetails;

  return source
    .map((item: any, index: number) => {
      if (typeof item === "string") {
        return {
          title: item.trim(),
          description: "",
          order: index + 1,
          isActive: true,
        };
      }

      return {
        title: normalizeOptionalString(
          item?.title ?? item?.name ?? item?.label
        ),
        description: sanitizeHtml(item?.description),
        order: Number(item?.order ?? index + 1),
        isActive: item?.isActive ?? true,
      };
    })
    .filter((item) => item.title);
};

const normalizeImportantDates = (value: unknown) => {
  if (!Array.isArray(value)) return DEFAULT_CALL_FOR_PAPER.importantDates;

  const cleaned = value
    .map((item: any, index: number) => ({
      label: normalizeOptionalString(item?.label),
      date: normalizeOptionalString(item?.date ?? item?.value),
      order: Number(item?.order ?? index + 1),
      isActive: item?.isActive ?? true,
    }))
    .filter((item) => item.label && item.date);

  return cleaned;
};

const normalizeCallForPaperPayload = (body: Record<string, any>) => {
  const submissionTypeDetails = normalizeSubmissionTypeDetails(
    body.submissionTypeDetails,
    body.submissionTypes
  );

  return {
    showInvitationLabel: body.showInvitationLabel ?? true,
    invitationLabel: normalizeOptionalString(body.invitationLabel),
    title: normalizeString(body.title, DEFAULT_CALL_FOR_PAPER.title),
    subtitle: normalizeOptionalString(body.subtitle, DEFAULT_CALL_FOR_PAPER.subtitle),
    description: sanitizeHtml(body.description),
    descriptionWidth: normalizeDescriptionWidth(body.descriptionWidth),
    descriptionAlignment: normalizeTextAlignment(body.descriptionAlignment),

    posterImage: normalizeOptionalString(body.posterImage),
    pdfUrl: normalizeString(body.pdfUrl, DEFAULT_CALL_FOR_PAPER.pdfUrl),
    pdfTitle: normalizeString(body.pdfTitle, DEFAULT_CALL_FOR_PAPER.pdfTitle),
    pdfSubtitle: normalizeString(body.pdfSubtitle, DEFAULT_CALL_FOR_PAPER.pdfSubtitle),
    showPdfActionButton: body.showPdfActionButton ?? true,
    pdfActionButtonLabel: normalizeString(
      body.pdfActionButtonLabel,
      DEFAULT_CALL_FOR_PAPER.pdfActionButtonLabel
    ),
    pdfActionButtonLink: normalizeString(
      body.pdfActionButtonLink,
      body.pdfUrl || DEFAULT_CALL_FOR_PAPER.pdfActionButtonLink
    ),
    showPdfActionButtonIcon: body.showPdfActionButtonIcon ?? true,
    showEmbeddedPdfViewer: body.showEmbeddedPdfViewer ?? true,

    submissionFormatLabel: normalizeOptionalString(body.submissionFormatLabel),
    submissionFormatTitle: normalizeString(
      body.submissionFormatTitle,
      DEFAULT_CALL_FOR_PAPER.submissionFormatTitle
    ),
    submissionFormatDescription: sanitizeHtml(
      body.submissionFormatDescription
    ),
    submissionTypes: submissionTypeDetails.map((item) => item.title),
    submissionTypeDetails,

    scopeLabel: normalizeOptionalString(body.scopeLabel),
    scopeTitle: normalizeString(body.scopeTitle, DEFAULT_CALL_FOR_PAPER.scopeTitle),
    scopeDescription: normalizeOptionalString(body.scopeDescription),
    engineeringTitle: normalizeString(
      body.engineeringTitle,
      DEFAULT_CALL_FOR_PAPER.engineeringTitle
    ),
    engineeringTopics: normalizeStringArray(
      body.engineeringTopics,
      DEFAULT_CALL_FOR_PAPER.engineeringTopics
    ),
    environmentalTitle: normalizeString(
      body.environmentalTitle,
      DEFAULT_CALL_FOR_PAPER.environmentalTitle
    ),
    environmentalTopics: normalizeStringArray(
      body.environmentalTopics,
      DEFAULT_CALL_FOR_PAPER.environmentalTopics
    ),

    finalSectionLabel: normalizeOptionalString(body.finalSectionLabel),
    finalSectionTitle: normalizeString(
      body.finalSectionTitle,
      DEFAULT_CALL_FOR_PAPER.finalSectionTitle
    ),
    finalSectionDescription: normalizeOptionalString(
      body.finalSectionDescription
    ),

    importantInfoLabel: normalizeOptionalString(body.importantInfoLabel),
    timelineTitle: normalizeString(
      body.timelineTitle,
      DEFAULT_CALL_FOR_PAPER.timelineTitle
    ),
    importantDates: normalizeImportantDates(body.importantDates),

    submitSectionLabel: normalizeOptionalString(body.submitSectionLabel),
    submitTitle: normalizeString(body.submitTitle, DEFAULT_CALL_FOR_PAPER.submitTitle),
    submitDescription: normalizeOptionalString(body.submitDescription),
    submissionButtonLabel: normalizeString(
      body.submissionButtonLabel,
      DEFAULT_CALL_FOR_PAPER.submissionButtonLabel
    ),
    submissionButtonLink: normalizeString(
      body.submissionButtonLink,
      DEFAULT_CALL_FOR_PAPER.submissionButtonLink
    ),
    guidelinesButtonLabel: normalizeString(
      body.guidelinesButtonLabel,
      DEFAULT_CALL_FOR_PAPER.guidelinesButtonLabel
    ),
    guidelinesButtonLink: normalizeString(
      body.guidelinesButtonLink,
      DEFAULT_CALL_FOR_PAPER.guidelinesButtonLink
    ),

    contactSectionLabel: normalizeOptionalString(body.contactSectionLabel),
    contactTitle: normalizeString(body.contactTitle, DEFAULT_CALL_FOR_PAPER.contactTitle),
    contactEditorLabel: normalizeString(
      body.contactEditorLabel,
      DEFAULT_CALL_FOR_PAPER.contactEditorLabel
    ),
    contactEditorName: normalizeString(
      body.contactEditorName,
      DEFAULT_CALL_FOR_PAPER.contactEditorName
    ),
    publishedByLabel: normalizeString(
      body.publishedByLabel,
      DEFAULT_CALL_FOR_PAPER.publishedByLabel
    ),
    publishedBy: normalizeString(body.publishedBy, DEFAULT_CALL_FOR_PAPER.publishedBy),
    publisherName: normalizeString(
      body.publisherName,
      DEFAULT_CALL_FOR_PAPER.publisherName
    ),
    publisherAddress: normalizeString(
      body.publisherAddress,
      DEFAULT_CALL_FOR_PAPER.publisherAddress
    ),
    contactEmail: normalizeString(body.contactEmail, DEFAULT_CALL_FOR_PAPER.contactEmail),
    contactPhone: normalizeOptionalString(body.contactPhone),
    publisherInfo: normalizeString(body.publisherInfo, DEFAULT_CALL_FOR_PAPER.publisherInfo),

    isPublished: body.isPublished ?? true,
  };
};

const mergeWithDefaults = (data: Record<string, any> | null | undefined) => {
  const source: Record<string, any> = {
    ...DEFAULT_CALL_FOR_PAPER,
    ...(data || {}),
  };

  // Preserve legacy manuscript type titles when older records do not yet
  // contain the new title/description structure.
  if (
    data &&
    (!Array.isArray(data.submissionTypeDetails) ||
      (data.submissionTypeDetails.length === 0 &&
        Array.isArray(data.submissionTypes) &&
        data.submissionTypes.length > 0))
  ) {
    delete source.submissionTypeDetails;
  }

  const merged = normalizeCallForPaperPayload(source);

  return {
    ...(data || {}),
    ...merged,
  };
};

const getOrCreateCallForPaper = async () => {
  let callForPaper = await CallForPaper.findOne();

  if (!callForPaper) {
    callForPaper = await CallForPaper.create(DEFAULT_CALL_FOR_PAPER);
  }

  return callForPaper;
};

export const getPublicCallForPaper = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const callForPaper = await getOrCreateCallForPaper();

    if (!callForPaper.isPublished) {
      res.status(404).json({
        success: false,
        message: "Call for papers content not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: mergeWithDefaults(callForPaper.toObject()),
    });
  } catch (error) {
    console.error("getPublicCallForPaper error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch call for papers content.",
    });
  }
};

export const getAdminCallForPaper = async (
  _req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const callForPaper = await getOrCreateCallForPaper();

    res.status(200).json({
      success: true,
      data: mergeWithDefaults(callForPaper.toObject()),
    });
  } catch (error) {
    console.error("getAdminCallForPaper error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch call for papers content.",
    });
  }
};

export const updateAdminCallForPaper = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const payload = normalizeCallForPaperPayload(req.body);

    let callForPaper = await CallForPaper.findOne();

    if (!callForPaper) {
      callForPaper = await CallForPaper.create(payload);
    } else {
      callForPaper.set(payload);
      await callForPaper.save();
    }

    res.status(200).json({
      success: true,
      message: "Call for papers content updated successfully.",
      data: mergeWithDefaults(callForPaper.toObject()),
    });
  } catch (error) {
    console.error("updateAdminCallForPaper error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update call for papers content.",
    });
  }
};


export const uploadAdminCallForPaperPdf = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const file = req.file;

    if (!file) {
      res.status(400).json({
        success: false,
        message: "No PDF file uploaded.",
      });
      return;
    }

    if (file.mimetype !== "application/pdf") {
      res.status(400).json({
        success: false,
        message: "Only PDF files are allowed for Call for Papers.",
      });
      return;
    }

    const pdfDirectory = path.join(process.cwd(), "public", "pdfs");
    const pdfFileName = "call-for-papers.pdf";
    const pdfPath = path.join(pdfDirectory, pdfFileName);

    await fs.mkdir(pdfDirectory, { recursive: true });

    // This replaces the existing file if it already exists.
    await fs.writeFile(pdfPath, file.buffer);

    // Keep the real file path fixed, but add a query string to avoid browser cache.
    const publicPdfUrl = `/pdfs/${pdfFileName}?v=${Date.now()}`;

    let callForPaper = await CallForPaper.findOne();

    if (!callForPaper) {
      callForPaper = await CallForPaper.create({
        ...DEFAULT_CALL_FOR_PAPER,
        pdfUrl: publicPdfUrl,
        pdfActionButtonLink: publicPdfUrl,
      });
    } else {
      const currentButtonLink = callForPaper.pdfActionButtonLink?.trim() || "";

      callForPaper.pdfUrl = publicPdfUrl;

      if (
        !currentButtonLink ||
        currentButtonLink.startsWith("/pdfs/call-for-papers.pdf")
      ) {
        callForPaper.pdfActionButtonLink = publicPdfUrl;
      }

      await callForPaper.save();
    }

    res.status(200).json({
      success: true,
      message: "PDF uploaded and replaced successfully.",
      data: mergeWithDefaults(callForPaper.toObject()),
      pdfUrl: publicPdfUrl,
    });
  } catch (error) {
    console.error("uploadAdminCallForPaperPdf error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to upload Call for Papers PDF.",
    });
  }
};

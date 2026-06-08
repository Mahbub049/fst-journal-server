import { Request, Response } from "express";
import CallForPaper from "../models/CallForPaper.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const DEFAULT_CALL_FOR_PAPER = {
  invitationLabel: "Publication Invitation",
  title: "Call for Papers",
  subtitle: "",
  description:
    "The Faculty of Science and Technology, Bangladesh University of Professionals, invites authors to submit original and high-quality manuscripts for the upcoming issue of the Journal of FST. The journal welcomes research contributions in engineering, computer science, communication technology, environmental science, management, and related interdisciplinary fields.",

  posterImage: "",
  pdfUrl: "/pdfs/call-for-papers.pdf",
  pdfTitle: "Call for Papers Document",
  pdfSubtitle: "Volume 4, Issue 1",

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
  guidelinesButtonLink: "/for-authors/submission-guidelines",

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

const normalizeStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) return fallback;

  const cleaned = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return cleaned.length ? cleaned : fallback;
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

  return cleaned.length ? cleaned : DEFAULT_CALL_FOR_PAPER.importantDates;
};

const normalizeCallForPaperPayload = (body: Record<string, any>) => {
  return {
    invitationLabel: normalizeString(
      body.invitationLabel,
      DEFAULT_CALL_FOR_PAPER.invitationLabel
    ),
    title: normalizeString(body.title, DEFAULT_CALL_FOR_PAPER.title),
    subtitle: normalizeOptionalString(body.subtitle, DEFAULT_CALL_FOR_PAPER.subtitle),
    description: normalizeString(
      body.description,
      DEFAULT_CALL_FOR_PAPER.description
    ),

    posterImage: normalizeOptionalString(body.posterImage),
    pdfUrl: normalizeString(body.pdfUrl, DEFAULT_CALL_FOR_PAPER.pdfUrl),
    pdfTitle: normalizeString(body.pdfTitle, DEFAULT_CALL_FOR_PAPER.pdfTitle),
    pdfSubtitle: normalizeString(body.pdfSubtitle, DEFAULT_CALL_FOR_PAPER.pdfSubtitle),

    submissionFormatLabel: normalizeString(
      body.submissionFormatLabel,
      DEFAULT_CALL_FOR_PAPER.submissionFormatLabel
    ),
    submissionFormatTitle: normalizeString(
      body.submissionFormatTitle,
      DEFAULT_CALL_FOR_PAPER.submissionFormatTitle
    ),
    submissionFormatDescription: normalizeString(
      body.submissionFormatDescription,
      DEFAULT_CALL_FOR_PAPER.submissionFormatDescription
    ),
    submissionTypes: normalizeStringArray(
      body.submissionTypes,
      DEFAULT_CALL_FOR_PAPER.submissionTypes
    ),

    scopeLabel: normalizeString(body.scopeLabel, DEFAULT_CALL_FOR_PAPER.scopeLabel),
    scopeTitle: normalizeString(body.scopeTitle, DEFAULT_CALL_FOR_PAPER.scopeTitle),
    scopeDescription: normalizeString(
      body.scopeDescription,
      DEFAULT_CALL_FOR_PAPER.scopeDescription
    ),
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

    finalSectionLabel: normalizeString(
      body.finalSectionLabel,
      DEFAULT_CALL_FOR_PAPER.finalSectionLabel
    ),
    finalSectionTitle: normalizeString(
      body.finalSectionTitle,
      DEFAULT_CALL_FOR_PAPER.finalSectionTitle
    ),
    finalSectionDescription: normalizeString(
      body.finalSectionDescription,
      DEFAULT_CALL_FOR_PAPER.finalSectionDescription
    ),

    importantInfoLabel: normalizeString(
      body.importantInfoLabel,
      DEFAULT_CALL_FOR_PAPER.importantInfoLabel
    ),
    timelineTitle: normalizeString(
      body.timelineTitle,
      DEFAULT_CALL_FOR_PAPER.timelineTitle
    ),
    importantDates: normalizeImportantDates(body.importantDates),

    submitSectionLabel: normalizeString(
      body.submitSectionLabel,
      DEFAULT_CALL_FOR_PAPER.submitSectionLabel
    ),
    submitTitle: normalizeString(body.submitTitle, DEFAULT_CALL_FOR_PAPER.submitTitle),
    submitDescription: normalizeString(
      body.submitDescription,
      DEFAULT_CALL_FOR_PAPER.submitDescription
    ),
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

    contactSectionLabel: normalizeString(
      body.contactSectionLabel,
      DEFAULT_CALL_FOR_PAPER.contactSectionLabel
    ),
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
  const merged = normalizeCallForPaperPayload({
    ...DEFAULT_CALL_FOR_PAPER,
    ...(data || {}),
  });

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

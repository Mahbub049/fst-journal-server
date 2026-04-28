import { Request, Response } from "express";
import CallForPaper from "../models/CallForPaper.model";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware";

const normalizeCallForPaperPayload = (body: Record<string, any>) => {
  return {
    title: body.title || "Call for Papers",
    subtitle: body.subtitle || "",
    description: body.description || "",

    posterImage: body.posterImage || "",
    pdfUrl: body.pdfUrl || "",

    importantDates: Array.isArray(body.importantDates)
      ? body.importantDates.map((item: any, index: number) => ({
          label: item.label || "",
          date: item.date || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    submissionButtonLabel: body.submissionButtonLabel || "Submit Manuscript",
    submissionButtonLink: body.submissionButtonLink || "",

    contactEmail: body.contactEmail || "",
    contactPhone: body.contactPhone || "",
    publisherInfo: body.publisherInfo || "",

    topics: Array.isArray(body.topics)
      ? body.topics.map((item: any, index: number) => ({
          title: item.title || "",
          description: item.description || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    instructions: Array.isArray(body.instructions)
      ? body.instructions.map((item: any, index: number) => ({
          text: item.text || "",
          order: Number(item.order ?? index + 1),
          isActive: item.isActive ?? true,
        }))
      : [],

    isPublished: body.isPublished ?? true,
  };
};

export const getPublicCallForPaper = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const callForPaper = await CallForPaper.findOne({
      isPublished: true,
    }).select("-__v");

    if (!callForPaper) {
      res.status(404).json({
        success: false,
        message: "Call for papers content not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: callForPaper,
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
    let callForPaper = await CallForPaper.findOne();

    if (!callForPaper) {
      callForPaper = await CallForPaper.create({
        title: "Call for Papers",
        subtitle: "Submit your research work to BUP FST Journal.",
        description:
          "Authors are invited to submit original research articles, review papers, and scholarly contributions within the scope of science, technology, engineering, and interdisciplinary research.",
        posterImage: "",
        pdfUrl: "",
        importantDates: [
          {
            label: "Submission Deadline",
            date: "To be announced",
            order: 1,
            isActive: true,
          },
          {
            label: "Notification of Acceptance",
            date: "To be announced",
            order: 2,
            isActive: true,
          },
        ],
        submissionButtonLabel: "Submit Manuscript",
        submissionButtonLink: "",
        contactEmail: "",
        contactPhone: "",
        publisherInfo: "Bangladesh University of Professionals",
        topics: [
          {
            title: "Computer Science and Information Technology",
            description: "AI, data science, software engineering, cybersecurity.",
            order: 1,
            isActive: true,
          },
        ],
        instructions: [
          {
            text: "Manuscripts must follow the journal template and author guidelines.",
            order: 1,
            isActive: true,
          },
        ],
        isPublished: true,
      });
    }

    res.status(200).json({
      success: true,
      data: callForPaper,
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

    if (!payload.title.trim()) {
      res.status(400).json({
        success: false,
        message: "Title is required.",
      });
      return;
    }

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
      data: callForPaper,
    });
  } catch (error) {
    console.error("updateAdminCallForPaper error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update call for papers content.",
    });
  }
};
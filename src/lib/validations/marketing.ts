import { z } from "zod";

type TFunc = (key: string) => string;

export const campaignChannelValues = [
  "INSTAGRAM",
  "FACEBOOK",
  "TIKTOK",
  "IN_STORE",
  "INFLUENCER",
  "OTHER",
] as const;

export const experimentStatusValues = ["IDEA", "TESTING", "LAUNCHED", "REJECTED"] as const;
export const feedbackSourceValues = ["IN_PERSON", "INSTAGRAM", "GOOGLE_REVIEW", "OTHER"] as const;
export const feedbackSentimentValues = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

export function campaignSchema(t: TFunc) {
  return z
    .object({
      name: z.string().min(1, t("validation.nameRequired")).max(200),
      description: z.string().max(2000).optional().or(z.literal("")),
      branchId: z.string().optional().or(z.literal("")),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate")),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate")),
      budgetIls: z.coerce.number().nonnegative(t("validation.budgetNonNegative")).optional(),
      channel: z.enum(campaignChannelValues),
      notes: z.string().max(1000).optional().or(z.literal("")),
      createExpense: z.boolean().optional(),
    })
    .refine((data) => data.endDate >= data.startDate, {
      message: t("validation.endBeforeStart"),
      path: ["endDate"],
    });
}

export type CampaignInput = z.output<ReturnType<typeof campaignSchema>>;
export type CampaignFormInput = z.input<ReturnType<typeof campaignSchema>>;

export function menuExperimentSchema(t: TFunc) {
  return z.object({
    productName: z.string().min(1, t("validation.productNameRequired")).max(200),
    notes: z.string().min(1, t("validation.notesRequired")).max(2000),
    status: z.enum(experimentStatusValues),
    branchId: z.string().optional().or(z.literal("")),
  });
}

export type MenuExperimentInput = z.output<ReturnType<typeof menuExperimentSchema>>;
export type MenuExperimentFormInput = z.input<ReturnType<typeof menuExperimentSchema>>;

export function feedbackSchema(t: TFunc) {
  return z.object({
    branchId: z.string().min(1, t("validation.branchRequired")),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t("validation.invalidDate")),
    source: z.enum(feedbackSourceValues),
    sentiment: z.enum(feedbackSentimentValues),
    content: z.string().min(1, t("validation.contentRequired")).max(2000),
  });
}

export type FeedbackInput = z.output<ReturnType<typeof feedbackSchema>>;
export type FeedbackFormInput = z.input<ReturnType<typeof feedbackSchema>>;

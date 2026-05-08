export type SurveyStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "quoted"
  | "won"
  | "lost"
  | "archived";

export type SurveySource = "public_form" | "internal";

export type SurveyDraftInput = {
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  siteAddress: string;
  settlement: string;
  projectGoal: string;
  budgetTier: string;
  serviceKeys: string[];
};

export const defaultSurveyDraft: SurveyDraftInput = {
  title: "",
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  siteAddress: "",
  settlement: "",
  projectGoal: "",
  budgetTier: "",
  serviceKeys: [],
};

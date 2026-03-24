import type {
  ReminderForm,
  ReminderLevel,
  SenderGender,
} from "./invoiceReminder";

export const REMINDER_FORM_COOKIE = "relance-facture-form";

export type StoredReminderState = ReminderForm & { level: ReminderLevel };

const GENDERS = new Set<SenderGender>(["neutral", "feminine", "masculine"]);

/** Limite par champ pour rester sous ~4 Ko côté cookie. */
const MAX = 240;

function clip(v: unknown): string {
  return typeof v === "string" ? v.slice(0, MAX) : "";
}

export function defaultReminderForm(): ReminderForm {
  return {
    senderName: "",
    senderJob: "",
    senderEmail: "",
    senderPhone: "",
    senderGender: "neutral",
    client: "",
    civility: "Madame, Monsieur",
    invoiceNum: "",
    amount: "",
    dueDate: "",
    days: "",
  };
}

/**
 * Lit l’objet cookie (souvent JSON parsé par Nuxt) et renvoie form + niveau sûrs.
 */
export function parseStoredReminderState(raw: unknown): {
  form: ReminderForm;
  level: ReminderLevel;
} | null {
  if (!raw || typeof raw !== "object") return null;

  const o = raw as Record<string, unknown>;
  const base = defaultReminderForm();

  let senderGender: SenderGender = base.senderGender;
  if (
    typeof o.senderGender === "string" &&
    GENDERS.has(o.senderGender as SenderGender)
  ) {
    senderGender = o.senderGender as SenderGender;
  }

  let dueDate = clip(o.dueDate);
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) dueDate = "";

  const civility = clip(o.civility) || base.civility;

  const form: ReminderForm = {
    senderName: clip(o.senderName),
    senderJob: clip(o.senderJob),
    senderEmail: clip(o.senderEmail),
    senderPhone: clip(o.senderPhone),
    senderGender,
    client: clip(o.client),
    civility,
    invoiceNum: clip(o.invoiceNum),
    amount: clip(o.amount),
    dueDate,
    days: clip(o.days),
  };

  let level: ReminderLevel = 1;
  if (o.level === 1 || o.level === 2 || o.level === 3) level = o.level;

  return { form, level };
}

export function buildStoredState(
  form: ReminderForm,
  level: ReminderLevel,
): StoredReminderState {
  return {
    senderName: form.senderName,
    senderJob: form.senderJob,
    senderEmail: form.senderEmail,
    senderPhone: form.senderPhone,
    senderGender: form.senderGender,
    client: form.client,
    civility: form.civility,
    invoiceNum: form.invoiceNum,
    amount: form.amount,
    dueDate: form.dueDate,
    days: form.days,
    level,
  };
}

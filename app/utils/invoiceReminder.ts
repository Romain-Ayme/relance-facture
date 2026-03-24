export type ReminderLevel = 1 | 2 | 3

/** Accord de l'expéditeur dans le corps du mail (reconnaissant·e, contraint·e). */
export type SenderGender = 'neutral' | 'feminine' | 'masculine'

export interface ReminderForm {
  senderName: string
  senderJob: string
  senderEmail: string
  senderPhone: string
  senderGender: SenderGender
  client: string
  civility: string
  invoiceNum: string
  amount: string
  dueDate: string
  days: string
}

export interface ReminderPayload {
  name: string
  job: string
  email: string
  phone: string
  gender: SenderGender
  client: string
  civ: string
  num: string
  amount: string
  due: string
  days: number | '—'
}

export function formatDueDate(iso: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

function signature(
  d: Pick<ReminderPayload, 'name' | 'job' | 'email' | 'phone'>
): string {
  let s = d.name
  if (d.job) s += `\n${d.job}`
  if (d.email) s += `\n${d.email}`
  if (d.phone) s += ` | ${d.phone}`
  return s
}

function genderAgreements(gender: SenderGender) {
  if (gender === 'feminine') {
    return { reconnaissant: 'reconnaissante', contraint: 'contrainte' }
  }
  if (gender === 'masculine') {
    return { reconnaissant: 'reconnaissant', contraint: 'contraint' }
  }
  return { reconnaissant: 'reconnaissant(e)', contraint: 'contraint(e)' }
}

export function formToPayload(form: ReminderForm): ReminderPayload {
  const parsed = Number.parseInt(form.days.trim(), 10)
  const days = Number.isFinite(parsed) ? parsed : '—'
  return {
    name: form.senderName.trim() || 'Votre nom',
    job: form.senderJob.trim(),
    email: form.senderEmail.trim(),
    phone: form.senderPhone.trim(),
    gender: form.senderGender,
    client: form.client.trim() || 'le client',
    civ: form.civility.trim() || 'Madame, Monsieur',
    num: form.invoiceNum.trim() || 'FAC-XXXX',
    amount: form.amount.trim() || '—',
    due: formatDueDate(form.dueDate.trim()),
    days
  }
}

type TemplateResult = { label: string, subject: string, body: string }

export const reminderTemplates: Record<
  ReminderLevel,
  (d: ReminderPayload) => TemplateResult
> = {
  1: (d) => {
    const g = genderAgreements(d.gender)
    return {
      label: 'Relance douce',
      subject: `Rappel – Facture n° ${d.num} – Échéance du ${d.due}`,
      body: `${d.civ},

Je me permets de vous contacter au sujet de la facture n° ${d.num} d'un montant de ${d.amount} €, dont l'échéance était fixée au ${d.due}.

Sauf erreur de ma part, je n'ai pas encore reçu le règlement correspondant. Il s'agit peut-être d'un simple oubli — aussi je vous serais ${g.reconnaissant} de bien vouloir procéder au paiement dans les meilleurs délais, ou de me confirmer que celui-ci est en cours de traitement.

N'hésitez pas à me contacter pour toute question.

Bien cordialement,
${signature(d)}`
    }
  },

  2: (d) => {
    const g = genderAgreements(d.gender)
    return {
      label: 'Relance ferme',
      subject: `2e relance – Facture n° ${d.num} impayée – ${d.amount} €`,
      body: `${d.civ},

Je reviens vers vous concernant la facture n° ${d.num} d'un montant de ${d.amount} €, dont le règlement était attendu le ${d.due}, soit il y a ${d.days} jour${d.days !== '—' && d.days > 1 ? 's' : ''}.

Malgré mon précédent rappel, je n'ai toujours pas reçu le paiement correspondant. Je vous demande de bien vouloir régulariser cette situation dans un délai de 8 jours à compter de ce message.

À défaut de règlement, je me verrais ${g.contraint} d'engager une procédure de recouvrement.

Je reste disponible pour tout échange à ce sujet.

Cordialement,
${signature(d)}`
    }
  },

  3: d => ({
    label: 'Mise en demeure',
    subject: `MISE EN DEMEURE – Facture n° ${d.num} – ${d.amount} € – Paiement exigé sous 48h`,
    body: `${d.civ},

Malgré mes relances restées sans suite, la facture n° ${d.num} d'un montant de ${d.amount} € demeure impayée à ce jour, avec un retard de ${d.days} jour${d.days !== '—' && d.days > 1 ? 's' : ''}.

Par la présente, je vous mets formellement en demeure de procéder au règlement intégral de cette somme dans un délai de 48 heures.

Passé ce délai, je transmettrai ce dossier à mon service juridique en vue d'un recouvrement par voie judiciaire. Des pénalités de retard conformément à l'article L.441-10 du Code de commerce seront également appliquées.

Je vous invite à me contacter immédiatement afin d'éviter toute procédure supplémentaire.

Cordialement,
${signature(d)}`
  })
}

export function generateReminder(
  level: ReminderLevel,
  form: ReminderForm
): TemplateResult {
  const d = formToPayload(form)
  return reminderTemplates[level](d)
}

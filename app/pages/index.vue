<script setup lang="ts">
import {
  type CalendarDate,
  DateFormatter,
  getLocalTimeZone,
  parseDate,
  today,
} from "@internationalized/date";
import type {
  ReminderLevel,
  ReminderForm,
  SenderGender,
} from "~/utils/invoiceReminder";
import { formToPayload, generateReminder } from "~/utils/invoiceReminder";
import {
  REMINDER_FORM_COOKIE,
  buildStoredState,
  defaultReminderForm,
  parseStoredReminderState,
  type StoredReminderState,
} from "~/utils/reminderFormCookie";

useSeoMeta({
  title: "Générateur de relance facture",
  description:
    "Rédigez des e-mails de relance pour factures impayées (auto-entrepreneur) : 1re relance, 2e relance, mise en demeure.",
});

const savedCookie = useCookie<StoredReminderState | null>(
  REMINDER_FORM_COOKIE,
  {
    default: () => null,
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  },
);

const restored = parseStoredReminderState(savedCookie.value);
const form = reactive<ReminderForm>(restored?.form ?? defaultReminderForm());
const level = ref<ReminderLevel>(restored?.level ?? 1);

const tz = getLocalTimeZone();

function dueDateToCalendar(iso: string): CalendarDate {
  if (!iso) return today(tz);
  try {
    return parseDate(iso);
  } catch {
    return today(tz);
  }
}

const dueCalendarDate = shallowRef<CalendarDate>(
  dueDateToCalendar(form.dueDate),
);

function persistFormCookie() {
  if (!import.meta.client) return;
  savedCookie.value = buildStoredState(
    toRaw(form) as ReminderForm,
    level.value,
  );
}

watch(form, persistFormCookie, { deep: true });
watch(level, persistFormCookie);

watch(
  dueCalendarDate,
  (d) => {
    form.dueDate = d.toString();
  },
  { immediate: true },
);

const dueDateFormatter = new DateFormatter("fr-FR", {
  dateStyle: "long",
});

const dueDateLabel = computed(() =>
  dueDateFormatter.format(dueCalendarDate.value.toDate(tz)),
);

const civilityItems = [
  { label: "Madame, Monsieur", value: "Madame, Monsieur" },
  { label: "Madame", value: "Madame" },
  { label: "Monsieur", value: "Monsieur" },
];

const genderItems: { label: string; value: SenderGender }[] = [
  {
    label: "Neutre (reconnaissant(e) / contraint(e))",
    value: "neutral",
  },
  { label: "Féminin", value: "feminine" },
  { label: "Masculin", value: "masculine" },
];

const generated = ref<{
  subject: string;
  body: string;
  label: string;
  level: ReminderLevel;
} | null>(null);

const preview = ref<ReturnType<typeof formToPayload> | null>(null);

function setLevel(n: ReminderLevel) {
  level.value = n;
}

function generate() {
  generated.value = {
    ...generateReminder(level.value, form),
    level: level.value,
  };
  preview.value = formToPayload(form);
}

const mailPlainText = computed(() => {
  if (!generated.value) return "";
  return `Objet : ${generated.value.subject}\n\n${generated.value.body}`;
});

const { copy, copied, isSupported } = useClipboard();
const toast = useToast();

async function copyEmail() {
  if (!mailPlainText.value) return;
  if (!isSupported.value) {
    toast.add({
      title: "Presse-papiers indisponible",
      description: "Votre navigateur ne permet pas la copie automatique.",
      color: "error",
    });
    return;
  }
  await copy(mailPlainText.value);
}

const levelMeta: Record<
  ReminderLevel,
  { label: string; color: "success" | "warning" | "error" }
> = {
  1: { label: "1re relance", color: "success" },
  2: { label: "2e relance", color: "warning" },
  3: { label: "3e relance", color: "error" },
};
</script>

<template>
  <UContainer class="py-8 sm:py-10">
    <div class="grid gap-8 lg:grid-cols-12 lg:gap-10">
      <div class="lg:col-span-5 xl:col-span-4">
        <UCard>
          <template #header>
            <h1 class="text-lg font-semibold text-highlighted">Paramètres</h1>
            <p class="text-sm text-muted mt-1">
              Renseignez les champs puis générez le corps du mail.
            </p>
          </template>

          <div class="space-y-6">
            <div>
              <p
                class="text-xs font-medium text-muted uppercase tracking-wide mb-3"
              >
                Niveau de relance
              </p>
              <div class="grid grid-cols-3 gap-2">
                <UButton
                  v-for="n in [1, 2, 3] as const"
                  :key="n"
                  :color="level === n ? levelMeta[n].color : 'neutral'"
                  :variant="level === n ? 'solid' : 'outline'"
                  size="sm"
                  class="justify-center"
                  @click="setLevel(n)"
                >
                  {{ n === 1 ? "1re" : n === 2 ? "2e" : "3e" }}
                </UButton>
              </div>
            </div>

            <USeparator />

            <div class="space-y-4">
              <p class="text-xs font-medium text-muted uppercase tracking-wide">
                Moi
              </p>
              <UFormField label="Prénom & nom">
                <UInput v-model="form.senderName" placeholder="Sophie Martin" />
              </UFormField>
              <UFormField
                label="Genre"
                description="Pour accorder le texte (1re et 2e relance)."
              >
                <USelect
                  v-model="form.senderGender"
                  :items="genderItems"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField label="Activité / métier">
                <UInput
                  v-model="form.senderJob"
                  placeholder="Développeur web freelance"
                />
              </UFormField>
              <UFormField label="Email">
                <UInput
                  v-model="form.senderEmail"
                  type="email"
                  placeholder="sophie@martin.fr"
                />
              </UFormField>
              <UFormField label="Téléphone" hint="optionnel">
                <UInput
                  v-model="form.senderPhone"
                  placeholder="06 12 34 56 78"
                />
              </UFormField>
            </div>

            <USeparator />

            <div class="space-y-4">
              <p class="text-xs font-medium text-muted uppercase tracking-wide">
                Client
              </p>
              <UFormField label="Nom du client / société">
                <UInput v-model="form.client" placeholder="Dupont SARL" />
              </UFormField>
              <UFormField label="Civilité">
                <USelect
                  v-model="form.civility"
                  :items="civilityItems"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
            </div>

            <USeparator />

            <div class="space-y-4">
              <p class="text-xs font-medium text-muted uppercase tracking-wide">
                Facture
              </p>
              <UFormField label="N° de facture">
                <UInput v-model="form.invoiceNum" placeholder="FAC-2024-042" />
              </UFormField>
              <UFormField label="Montant TTC (€)">
                <UInput v-model="form.amount" placeholder="1 250,00" />
              </UFormField>
              <UFormField label="Date d'échéance">
                <UPopover :content="{ align: 'start' }">
                  <UButton
                    color="neutral"
                    variant="outline"
                    block
                    trailing-icon="i-lucide-calendar"
                    class="font-normal justify-between"
                  >
                    {{ dueDateLabel }}
                  </UButton>

                  <template #content="{ close }">
                    <UCalendar
                      v-model="dueCalendarDate"
                      color="primary"
                      class="p-2"
                      @update:model-value="close?.()"
                    />
                  </template>
                </UPopover>
              </UFormField>
              <UFormField label="Jours de retard">
                <UInput
                  v-model="form.days"
                  type="number"
                  :min="1"
                  placeholder="15"
                />
              </UFormField>
            </div>

            <UButton block size="lg" icon="i-lucide-mail" @click="generate">
              Générer le mail
            </UButton>
          </div>
        </UCard>
      </div>

      <div class="lg:col-span-7 xl:col-span-8 min-h-[320px]">
        <template v-if="!generated">
          <UCard class="h-full min-h-[360px] flex items-center justify-center">
            <div class="text-center px-4 py-12 max-w-sm mx-auto">
              <UIcon
                name="i-lucide-mail"
                class="size-14 text-dimmed mx-auto mb-4"
              />
              <p class="text-muted text-sm leading-relaxed">
                Renseignez vos informations puis cliquez sur
                <strong class="text-default">Générer le mail</strong>.
              </p>
            </div>
          </UCard>
        </template>

        <div v-else class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-lg font-semibold text-highlighted">
                Mail généré
              </h2>
              <UBadge
                :color="levelMeta[generated.level].color"
                variant="subtle"
              >
                {{ generated.label }}
              </UBadge>
            </div>
            <UButton
              color="neutral"
              variant="outline"
              :icon="copied ? 'i-lucide-check' : 'i-lucide-copy'"
              @click="copyEmail"
            >
              {{ copied ? "Copié" : "Copier" }}
            </UButton>
          </div>

          <UCard :ui="{ body: 'p-0 sm:p-0' }">
            <div class="divide-y divide-default">
              <div class="px-4 py-3 sm:px-6 bg-elevated/50 space-y-2 text-sm">
                <div class="flex gap-3">
                  <span
                    class="text-muted shrink-0 w-14 uppercase text-xs tracking-wide pt-0.5"
                    >Objet</span
                  >
                  <span class="text-highlighted font-medium break-words">{{
                    generated.subject
                  }}</span>
                </div>
                <div v-if="preview" class="flex gap-3">
                  <span
                    class="text-muted shrink-0 w-14 uppercase text-xs tracking-wide pt-0.5"
                    >À</span
                  >
                  <span class="text-default break-words">{{
                    preview.client
                  }}</span>
                </div>
                <div v-if="preview" class="flex gap-3">
                  <span
                    class="text-muted shrink-0 w-14 uppercase text-xs tracking-wide pt-0.5"
                    >De</span
                  >
                  <span class="text-default break-words">
                    {{ preview.name
                    }}<template v-if="preview.job">
                      — {{ preview.job }}</template
                    >
                  </span>
                </div>
              </div>
              <div class="px-4 py-5 sm:px-6 sm:py-6">
                <pre
                  class="whitespace-pre-wrap font-mono text-sm text-default leading-relaxed"
                  >{{ generated.body }}</pre
                >
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </UContainer>
</template>

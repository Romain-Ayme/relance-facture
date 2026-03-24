<script setup lang="ts">
import { fr } from '@nuxt/ui/locale'

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [{ rel: 'icon', href: '/favicon.ico' }],
  htmlAttrs: {
    lang: 'fr'
  }
})

const title = 'Relance facture'
const description
  = 'Générateur d’e-mails de relance pour factures impayées (auto-entrepreneur).'

useSeoMeta({
  titleTemplate: '%s · Relance facture',
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp :locale="fr">
    <UHeader class="border-b border-default">
      <template #left>
        <NuxtLink
          to="/"
          class="flex flex-col gap-0.5"
        >
          <span class="font-semibold text-highlighted">Relance facture</span>
          <span class="text-xs text-muted">Auto-entrepreneur</span>
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <USeparator />

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          Outil local — les données restent dans votre navigateur.
        </p>
      </template>
    </UFooter>
  </UApp>
</template>

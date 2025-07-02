// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
  ],
  unocss: {
    uno: true,
    attributify: true,
    icons: {
      collections: {
        mdi: () => import('@iconify-json/mdi/icons.json')
      }
    },
    shortcuts: [],
    rules: [],
  },
})

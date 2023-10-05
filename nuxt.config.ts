import ReactivityTransform from '@vue-macros/reactivity-transform/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  typescript: {
    strict: true,
  },
  devtools: true,
  modules: [
    "@nuxtjs/tailwindcss",
    "@tailwindcss/typography",
    "nuxt-vuefire",
    "@vueuse/nuxt",
    "@nuxt/image",
    "nuxt-icon"
  ],
  app: {
    head: {
      title: "Seating Planner",
      htmlAttrs: {
        lang: "de",
      },
    },
  },
  ssr: false,
  vuefire: {
    auth: true,
    config: {
      apiKey: "AIzaSyBLsJJIbM9dujWpKC-TfXzgIMq-XGCnhCM",
      authDomain: "seating-planner-7a7b1.firebaseapp.com",
      projectId: "seating-planner-7a7b1",
      storageBucket: "seating-planner-7a7b1.appspot.com",
      messagingSenderId: "728143838714",
      appId: "1:728143838714:web:8e06d40d7a033108caf843"
    }
  },
  vite: {
    plugins: [
      ReactivityTransform()
    ]
  },
  image: {
    presets: {
      default: {
        modifiers: {
          format: "webp",
        }
      }
    }
  }
})
export const defaultLocale = "ru";

export const locales = {
  ru: "Русский",
  hy: "Հայերեն",
  en: "English"
} as const;

export type Locale = keyof typeof locales;

export const localizedPaths = {
  ru: {
    home: "/",
    about: "/about/",
    programs: "/programs/",
    gallery: "/gallery/",
    videos: "/videos/",
    events: "/events/",
    news: "/news/",
    contacts: "/contacts/"
  }
} as const;

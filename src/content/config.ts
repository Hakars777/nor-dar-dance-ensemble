import { defineCollection, z } from "astro:content";

const imagePath = z.string().startsWith("/uploads/");

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    cover: imagePath,
    excerpt: z.string(),
    draft: z.boolean().default(false)
  })
});

const events = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    place: z.string(),
    description: z.string(),
    cover: imagePath,
    status: z.enum(["upcoming", "past"])
  })
});

const gallery = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    image: imagePath,
    alt: z.string(),
    date: z.coerce.date().optional(),
    category: z.string().default("Сцена"),
    featured: z.boolean().default(false)
  })
});

const videos = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    provider: z.enum(["youtube", "vimeo"]),
    videoId: z.string(),
    description: z.string(),
    date: z.coerce.date().optional()
  })
});

const programs = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: imagePath,
    order: z.number(),
    featured: z.boolean().default(false)
  })
});

const settings = defineCollection({
  type: "data",
  schema: z.object({
    heroImage: z.string().optional(),
    siteTitle: z.string(),
    siteDescription: z.string(),
    phone: z.string(),
    email: z.string().email(),
    address: z.string(),
    instagram: z.string().url(),
    facebook: z.string().url(),
    youtube: z.string().url(),
    telegram: z.string().url(),
    seoTitle: z.string(),
    seoDescription: z.string()
  })
});

export const collections = {
  news,
  events,
  gallery,
  videos,
  programs,
  settings
};

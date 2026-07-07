import { defineType, defineField, defineArrayMember } from 'sanity';

export const faqItemType = defineType({
  name: 'faqItem',
  title: 'FAQ Item',
  type: 'object',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required().max(200),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [{ title: 'Bullet', value: 'bullet' }],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', title: 'URL' },
                  { name: 'blank', type: 'boolean', title: 'Open in new tab' },
                ],
              },
            ],
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'question',
    },
  },
});

export const faqSectionType = defineType({
  name: 'faqSection',
  title: 'FAQ Section',
  type: 'object',
  description:
    'Accordion-style FAQ block. Best used near the end of the article for objection handling, buyer questions, or implementation FAQs.',
  fields: [
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
      initialValue: 'FAQ',
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: 'items',
      title: 'FAQ Items',
      type: 'array',
      validation: (rule) => rule.required().min(1),
      of: [defineArrayMember({ type: 'faqItem' })],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      items: 'items',
    },
    prepare(selection) {
      const count = Array.isArray(selection.items) ? selection.items.length : 0;
      return {
        title: selection.title || 'FAQ',
        subtitle: `${count} item${count === 1 ? '' : 's'}`,
      };
    },
  },
});

export const blogPostType = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title (H1)',
      type: 'string',
      description: 'Primary headline — renders as the page <h1>. Keep under 70 chars for Google.',
      validation: (rule) =>
        rule
          .required()
          .max(70)
          .warning('Keep the title under 70 characters so it fits Google search results.'),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description: 'Auto-generated from title. Only change if you know what you\'re doing.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt (Meta Description)',
      type: 'text',
      rows: 3,
      description:
        'Shown in blog listing, Google search snippet, and OG/Twitter card. 120–160 chars is ideal.',
      validation: (rule) =>
        rule
          .required()
          .min(80)
          .max(160)
          .error('Excerpt must be 80–160 characters — this is your Google meta description.'),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published At',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'author',
      title: 'Author',
      type: 'string',
      description: 'Full name — shown in byline and OG/Twitter author tag.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      description:
        'Required. Displayed at top of post and used as the Open Graph + Twitter card image. Minimum 1200×630px recommended.',
      validation: (rule) => rule.required().error('Hero image is required — it becomes the OG/Twitter preview image.'),
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          description: 'Describe the image for screen readers and Google Image Search.',
          validation: (rule) =>
            rule.required().error('Alt text is required for accessibility and SEO.'),
        }),
      ],
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Used for auto related-post recommendations. Pick 2–5 tags.',
      options: {
        list: [
          { title: 'Compliance', value: 'compliance' },
          { title: 'KYA', value: 'kya' },
          { title: 'MiCA', value: 'mica' },
          { title: 'EU AI Act', value: 'eu-ai-act' },
          { title: 'Identity', value: 'identity' },
          { title: 'Agent Security', value: 'agent-security' },
          { title: 'Trading Bot', value: 'trading-bot' },
          { title: 'Case Study', value: 'case-study' },
          { title: 'Architecture', value: 'architecture' },
          { title: 'SDK', value: 'sdk' },
          { title: 'API', value: 'api' },
          { title: 'Certificates', value: 'certificates' },
          { title: 'Audit Log', value: 'audit-log' },
          { title: 'Behavioral Profiling', value: 'behavioral-profiling' },
        ],
        layout: 'tags',
      },
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      description:
        'Use H2 for top-level sections, H3 for sub-sections. Do NOT use H1 — the title is the H1. Minimum 2 headings to enable the Table of Contents.',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'H2 — Section heading', value: 'h2' },
            { title: 'H3 — Sub-section', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
            { title: 'Code Block', value: 'code' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
              { title: 'Code', value: 'code' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  { name: 'href', type: 'url', title: 'URL' },
                  { name: 'blank', type: 'boolean', title: 'Open in new tab' },
                ],
              },
            ],
          },
        }),
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt Text',
              type: 'string',
              description: 'Required for accessibility and SEO.',
              validation: (rule) =>
                rule.required().error('Add alt text for every inline image.'),
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional — shown as figcaption below the image.',
            }),
          ],
        }),
        defineArrayMember({ type: 'faqSection' }),
      ],
      validation: (rule) => rule.required().min(1).error('Content cannot be empty.'),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'publishedAt',
      media: 'image',
    },
  },
});

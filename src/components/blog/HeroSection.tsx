interface HeroSectionProps {
  title: string;
  subtitle: string;
}

export function HeroSection({ title, subtitle }: HeroSectionProps) {
  return (
    <section className="w-full bg-white border-b border-kakunin-border">
      <div className="mx-auto max-w-4xl px-8 py-20 md:px-12 md:py-24 lg:px-16 lg:py-32">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-kakunin-accent" />
          <span className="text-sm font-medium tracking-wide text-kakunin-meta">
            KAKUNIN BLOG
          </span>
        </div>

        <h1 className="mb-6 text-4xl font-600 leading-tight text-kakunin-heading md:text-5xl">
          {title}
        </h1>

        <p className="max-w-2xl text-lg leading-relaxed text-kakunin-body">
          {subtitle}
        </p>
      </div>
    </section>
  );
}

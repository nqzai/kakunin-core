'use client';

import type { CSSProperties, MouseEvent, ReactNode } from 'react';

type SafeEmailLinkProps = {
  email: string;
  label?: ReactNode;
  subject?: string;
  className?: string;
  style?: CSSProperties;
};

function buildMailtoHref(email: string, subject?: string) {
  if (!subject) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

function obfuscatedLabel(email: string) {
  const [local, domain] = email.split('@');
  return `${local} [at] ${domain}`;
}

export function SafeEmailLink({
  email,
  label,
  subject,
  className,
  style,
}: SafeEmailLinkProps) {
  const href = buildMailtoHref(email, subject);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    window.location.href = href;
  }

  return (
    <a
      href="#email"
      onClick={handleClick}
      className={className}
      style={style}
      aria-label="Send email"
    >
      {label ?? obfuscatedLabel(email)}
    </a>
  );
}

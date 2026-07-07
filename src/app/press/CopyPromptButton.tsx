'use client';

/**
 * Client component for copying the press release prompt to clipboard.
 * Separated from the main press page to allow Server Component metadata export.
 */
export function CopyPromptButton({ text }: { text: string }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Prompt copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy prompt');
    }
  };

  return (
    <button
      type="button"
      className="btn btn--primary btn--lg"
      onClick={handleCopy}
    >
      Copy Prompt
    </button>
  );
}

'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
    >
      Print / Save as PDF
    </button>
  );
}

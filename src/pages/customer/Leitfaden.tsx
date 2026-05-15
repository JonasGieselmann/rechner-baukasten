import { BRAND } from '../../../branding/tokens';

export default function Leitfaden() {
  return (
    <div className="max-w-2xl mx-auto">
      <div
        className="rounded-2xl border p-6 space-y-4"
        style={{ backgroundColor: BRAND.colors.card, borderColor: BRAND.colors.border }}
      >
        <h1 className="text-2xl font-semibold" style={{ color: BRAND.colors.text }}>
          Leitfaden
        </h1>
        <p className="text-base opacity-70 leading-relaxed" style={{ color: BRAND.colors.text }}>
          Hier kommt der BeautyFlow Leitfaden rein. Wird gerade aufbereitet.
        </p>
        <a
          href="https://beauty-flow.de/blueprint"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-colors hover:bg-neutral-800"
          style={{ backgroundColor: BRAND.colors.primary, color: '#ffffff' }}
        >
          Vorab herunterladen
          <span aria-hidden="true">&#x21AA;</span>
        </a>
      </div>
    </div>
  );
}

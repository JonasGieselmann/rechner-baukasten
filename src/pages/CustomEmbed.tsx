import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

interface CustomCalculatorConfig {
  id: string;
  name: string;
  description: string;
  slug: string;
  path: string;
  width: string;
  height: string;
  active: boolean;
}

interface Registry {
  calculators: CustomCalculatorConfig[];
}

export function CustomEmbed() {
  const { slug } = useParams<{ slug: string }>();
  const [calculator, setCalculator] = useState<CustomCalculatorConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCalculator() {
      try {
        // Fetch the registry
        const response = await fetch('/custom-calculators/registry.json');
        if (!response.ok) {
          throw new Error('Registry not found');
        }
        const registry: Registry = await response.json();

        // Find the calculator by slug
        const calc = registry.calculators.find((c) => c.slug === slug);
        if (!calc) {
          throw new Error(`Calculator "${slug}" not found`);
        }

        if (!calc.active) {
          throw new Error(`Calculator "${slug}" is not active`);
        }

        setCalculator(calc);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadCalculator();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#04070d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7EC8F3] border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#04070d] flex items-center justify-center p-4">
        <div className="bg-[#12121a] border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Rechner nicht gefunden</h2>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!calculator) {
    return null;
  }

  return (
    <iframe
      src={calculator.path}
      title={calculator.name}
      style={{
        width: calculator.width,
        height: calculator.height,
        border: 'none',
        display: 'block',
      }}
      allowFullScreen
    />
  );
}

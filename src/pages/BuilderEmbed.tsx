import { useParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { BlockRenderer } from '../components/BlockRenderer';
import { useCalculatorStore } from '../store/calculatorStore';

export function BuilderEmbed() {
  const { id } = useParams<{ id: string }>();
  const { calculator, loadCalculator, savedCalculators, loadSavedCalculators, isInitialized } = useCalculatorStore();

  useEffect(() => {
    // Load saved calculators from localStorage
    loadSavedCalculators();
  }, [loadSavedCalculators]);

  // Derive loading and error states from store data
  const { isLoading, error, targetCalc } = useMemo(() => {
    // Still loading if store hasn't been initialized yet
    if (!isInitialized) {
      return { isLoading: true, error: null, targetCalc: null };
    }

    const calc = savedCalculators.find((c) => c.id === id);
    if (!calc) {
      return { isLoading: false, error: `Rechner "${id}" nicht gefunden`, targetCalc: null };
    }

    return { isLoading: false, error: null, targetCalc: calc };
  }, [savedCalculators, id, isInitialized]);

  // Load the calculator when found
  useEffect(() => {
    if (targetCalc) {
      loadCalculator(targetCalc);
    }
  }, [targetCalc, loadCalculator]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#04070d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#7EC8F3] border-t-transparent" />
      </div>
    );
  }

  if (error || !calculator) {
    return (
      <div className="min-h-screen bg-[#04070d] flex items-center justify-center p-4">
        <div className="bg-[#12121a] border border-red-500/30 rounded-xl p-6 max-w-md text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold text-white mb-2">Rechner nicht gefunden</h2>
          <p className="text-gray-400">{error || 'Der Rechner konnte nicht geladen werden.'}</p>
        </div>
      </div>
    );
  }

  const blocks = [...calculator.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-[#04070d] p-8">
      <div className="max-w-3xl mx-auto">
        <div className="space-y-4">
          {blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}

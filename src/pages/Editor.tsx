import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCalculatorStore } from '../store/calculatorStore';
import { EditorLayout } from '../components/EditorLayout';
import { BRAND } from '../../branding/tokens';

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    loadCalculatorById,
    saveCalculator,
    calculator,
    isDirty,
  } = useCalculatorStore();

  // Load calculator from the server on mount
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadCalculatorById(id).then(found => {
      // Calculator not found, redirect to home
      if (!cancelled && !found) navigate('/');
    });
    return () => {
      cancelled = true;
    };
  }, [id, loadCalculatorById, navigate]);

  // Debounced autosave: fires once typing pauses (same cadence as FunnelEditor)
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      void saveCalculator();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isDirty, saveCalculator, calculator]);

  // Save on page leave
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        void saveCalculator();
        e.preventDefault();
        e.returnValue = '';
      }
    },
    [isDirty, saveCalculator]
  );

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  // Show loading while calculator loads
  if (!calculator) {
    return (
      <div
        className="h-screen flex items-center justify-center"
        style={{ backgroundColor: BRAND.colors.background }}
      >
        <div style={{ color: BRAND.colors.muted }}>Laden...</div>
      </div>
    );
  }

  return <EditorLayout />;
}

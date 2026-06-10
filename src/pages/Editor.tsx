import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCalculatorStore } from '../store/calculatorStore';
import { EditorLayout } from '../components/EditorLayout';
import { updateBuilderCalc } from '../lib/builderApi';
import { useOrgQuery } from '../lib/useOrgQuery';
import { BRAND } from '../../branding/tokens';

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { withQ } = useOrgQuery();
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
      // Calculator not found, redirect to the list (keep the org drill-in)
      if (!cancelled && !found) navigate(withQ('/agency/rechner'));
    });
    return () => {
      cancelled = true;
    };
    // withQ is derived from the URL search params and stable per location
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadCalculatorById, navigate]);

  // SPA-navigation away (header nav, browser back) unmounts the editor and the
  // debounce cleanup cancels the pending timer — flush the save instead; the
  // fetch outlives the unmounted component.
  useEffect(() => {
    return () => {
      const s = useCalculatorStore.getState();
      if (s.isDirty && s.calculator) void s.saveCalculator();
    };
  }, []);

  // Debounced autosave: fires once typing pauses (same cadence as FunnelEditor)
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      void saveCalculator();
    }, 1500);

    return () => clearTimeout(timer);
  }, [isDirty, saveCalculator, calculator]);

  // Save on page leave. keepalive lets the PATCH survive the tab close (a
  // normal fetch gets aborted); the dialog still warns about unsaved changes.
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    const s = useCalculatorStore.getState();
    if (s.isDirty && s.calculator) {
      void updateBuilderCalc({ ...s.calculator, updatedAt: new Date() }, { keepalive: true }).catch(() => { /* best effort */ });
      e.preventDefault();
      e.returnValue = '';
    }
  }, []);

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

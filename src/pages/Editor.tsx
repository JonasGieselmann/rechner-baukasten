import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCalculatorStore } from '../store/calculatorStore';
import { EditorLayout } from '../components/EditorLayout';

export function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    loadSavedCalculators,
    loadCalculatorById,
    saveCalculator,
    calculator,
    isDirty,
  } = useCalculatorStore();

  // Load calculator on mount
  useEffect(() => {
    loadSavedCalculators();
  }, [loadSavedCalculators]);

  useEffect(() => {
    if (id) {
      const found = loadCalculatorById(id);
      if (!found) {
        // Calculator not found, redirect to home
        navigate('/');
      }
    }
  }, [id, loadCalculatorById, navigate]);

  // Autosave every 30 seconds if dirty
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      saveCalculator();
    }, 30000);

    return () => clearTimeout(timer);
  }, [isDirty, saveCalculator, calculator]);

  // Save on page leave
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        saveCalculator();
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
      <div className="h-screen bg-[#04070d] flex items-center justify-center">
        <div className="text-[#6b7a90]">Laden...</div>
      </div>
    );
  }

  return <EditorLayout />;
}

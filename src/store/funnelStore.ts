import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Funnel,
  FunnelStep,
  FunnelStepType,
  FunnelTheme,
  FunnelSettings,
} from '../types';
import { DEFAULT_FUNNEL_THEME, DEFAULT_LEAD_FIELDS } from '../types';
import {
  listFunnels,
  createFunnel,
  getFunnel,
  updateFunnel,
  deleteFunnel,
} from '../lib/funnelApi';

interface FunnelState {
  funnels: Funnel[];
  isInitialized: boolean;
  current: Funnel | null;
  selectedStepId: string | null;
  isDirty: boolean;
  isSaving: boolean;

  loadFunnels: () => Promise<void>;
  createFunnel: (name: string) => Promise<string>;
  loadFunnel: (id: string) => Promise<void>;
  saveCurrent: () => Promise<void>;
  deleteFunnel: (id: string) => Promise<void>;
  closeCurrent: () => void;
  updateCurrentMeta: (updates: Partial<Pick<Funnel, 'name' | 'description' | 'slug' | 'status'>>) => void;

  addStep: (type: FunnelStepType, atIndex?: number) => void;
  updateStep: (id: string, updates: Partial<FunnelStep>) => void;
  deleteStep: (id: string) => void;
  reorderSteps: (activeId: string, overId: string) => void;
  selectStep: (id: string | null) => void;

  updateTheme: (updates: Partial<FunnelTheme>) => void;
  updateSettings: (updates: Partial<FunnelSettings>) => void;
}

function buildDefaultStep(type: FunnelStepType): FunnelStep {
  const id = nanoid();
  switch (type) {
    case 'intro':
      return { id, type, title: 'Willkommen', body: '', ctaLabel: 'Starten' };
    case 'lead-capture':
      return { id, type, title: 'Deine Daten', body: '', fields: DEFAULT_LEAD_FIELDS, ctaLabel: 'Weiter' };
    case 'question':
      return {
        id,
        type,
        question: 'Neue Frage?',
        dimension: 'social-media',
        options: [{ id: nanoid(), label: 'Antwort 1', score: 50 }],
        allowMultiple: false,
        required: true,
      };
    case 'calc-input':
      return {
        id,
        type,
        label: 'Neues Feld',
        variableName: `var_${nanoid(6)}`,
        inputType: 'number',
        defaultValue: 0,
        min: 0,
        max: 1000,
      };
    case 'result-spider':
      return { id, type, title: 'Dein Ergebnis', body: '', showKalkuChart: true, cliffhanger: '' };
    case 'cta-booking':
      return { id, type, title: 'Strategiegespräch', body: '', ctaLabel: 'Termin buchen', calendarUrl: '' };
  }
}

function replaceInList(funnels: Funnel[], updated: Funnel): Funnel[] {
  return funnels.map(f => (f.id === updated.id ? updated : f));
}

export const useFunnelStore = create<FunnelState>((set, get) => ({
  funnels: [],
  isInitialized: false,
  current: null,
  selectedStepId: null,
  isDirty: false,
  isSaving: false,

  loadFunnels: async () => {
    const funnels = await listFunnels();
    set({ funnels, isInitialized: true });
  },

  createFunnel: async (name: string) => {
    const funnel = await createFunnel({ name });
    set(s => ({ funnels: [funnel, ...s.funnels] }));
    return funnel.id;
  },

  loadFunnel: async (id: string) => {
    const funnel = await getFunnel(id);
    set({ current: funnel, selectedStepId: null, isDirty: false });
  },

  saveCurrent: async () => {
    const { current, funnels } = get();
    if (!current) return;
    set({ isSaving: true });
    try {
      const updated = await updateFunnel(current.id, {
        name: current.name,
        description: current.description,
        slug: current.slug,
        status: current.status,
        config: current.config,
      });
      set({ current: updated, funnels: replaceInList(funnels, updated), isDirty: false });
    } finally {
      set({ isSaving: false });
    }
  },

  deleteFunnel: async (id: string) => {
    await deleteFunnel(id);
    set(s => ({
      funnels: s.funnels.filter(f => f.id !== id),
      current: s.current?.id === id ? null : s.current,
    }));
  },

  closeCurrent: () => {
    const { isDirty, saveCurrent } = get();
    if (isDirty) {
      void saveCurrent();
    }
    set({ current: null, selectedStepId: null, isDirty: false });
  },

  updateCurrentMeta: (updates) => {
    const { current } = get();
    if (!current) return;
    set({ current: { ...current, ...updates }, isDirty: true });
  },

  addStep: (type: FunnelStepType, atIndex?: number) => {
    const { current } = get();
    if (!current) return;
    const newStep = buildDefaultStep(type);
    const steps = [...current.config.steps];
    const insertAt = atIndex !== undefined ? atIndex : steps.length;
    steps.splice(insertAt, 0, newStep);
    set({
      current: { ...current, config: { ...current.config, steps } },
      selectedStepId: newStep.id,
      isDirty: true,
    });
  },

  updateStep: (id: string, updates: Partial<FunnelStep>) => {
    const { current } = get();
    if (!current) return;
    const steps = current.config.steps.map(s => {
      if (s.id !== id) return s;
      // Updates may carry a `type` field only when caller is replacing the
      // step. Drop it to keep the tagged-union discriminant stable.
      const { type: _t, ...safe } = updates as { type?: FunnelStep['type'] } & Partial<FunnelStep>;
      void _t;
      return { ...s, ...safe } as FunnelStep;
    });
    set({ current: { ...current, config: { ...current.config, steps } }, isDirty: true });
  },

  deleteStep: (id: string) => {
    const { current } = get();
    if (!current) return;
    const steps = current.config.steps.filter(s => s.id !== id);
    set({
      current: { ...current, config: { ...current.config, steps } },
      selectedStepId: null,
      isDirty: true,
    });
  },

  reorderSteps: (activeId: string, overId: string) => {
    const { current } = get();
    if (!current) return;
    const steps = [...current.config.steps];
    const activeIndex = steps.findIndex(s => s.id === activeId);
    const overIndex = steps.findIndex(s => s.id === overId);
    if (activeIndex === -1 || overIndex === -1) return;
    const [removed] = steps.splice(activeIndex, 1);
    steps.splice(overIndex, 0, removed);
    set({ current: { ...current, config: { ...current.config, steps } }, isDirty: true });
  },

  selectStep: (id: string | null) => {
    set({ selectedStepId: id });
  },

  updateTheme: (updates: Partial<FunnelTheme>) => {
    const { current } = get();
    if (!current) return;
    const theme = { ...DEFAULT_FUNNEL_THEME, ...current.config.theme, ...updates };
    set({ current: { ...current, config: { ...current.config, theme } }, isDirty: true });
  },

  updateSettings: (updates: Partial<FunnelSettings>) => {
    const { current } = get();
    if (!current) return;
    const settings = { ...current.config.settings, ...updates };
    set({ current: { ...current, config: { ...current.config, settings } }, isDirty: true });
  },
}));

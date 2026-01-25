import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  Block,
  CalculatorConfig,
  ThemeConfig,
  TextBlock,
  InputBlock,
  SliderBlock,
  ResultBlock,
  ChartBlock,
  ComparisonBlock,
} from '../types';
import { DEFAULT_THEME } from '../types';
import { FormulaEngine } from '../engine/formula';

interface CalculatorState {
  // Current calculator
  calculator: CalculatorConfig | null;

  // Variables (runtime values from inputs/sliders)
  variables: Record<string, number>;

  // Formula engine instance
  engine: FormulaEngine;

  // Selected block for editing
  selectedBlockId: string | null;

  // Editor mode
  isPreviewMode: boolean;

  // Actions
  createNewCalculator: (name: string) => void;
  loadCalculator: (config: CalculatorConfig) => void;

  // Block operations
  addBlock: (type: Block['type']) => void;
  updateBlock: (id: string, updates: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  reorderBlocks: (activeId: string, overId: string) => void;

  // Selection
  selectBlock: (id: string | null) => void;

  // Variables
  setVariable: (name: string, value: number) => void;

  // Preview mode
  togglePreviewMode: () => void;

  // Evaluate formula
  evaluate: (formula: string) => number;

  // Theme
  updateTheme: (updates: Partial<ThemeConfig>) => void;

  // Export
  getEmbedCode: () => string;
  exportConfig: () => string;
}

// Create default blocks for new calculators
function createDefaultBlocks(): Block[] {
  return [
    {
      id: nanoid(),
      type: 'text',
      order: 0,
      content: 'Mein Rechner',
      size: 'h1',
    } as TextBlock,
  ];
}

export const useCalculatorStore = create<CalculatorState>((set, get) => ({
  calculator: null,
  variables: {},
  engine: new FormulaEngine(),
  selectedBlockId: null,
  isPreviewMode: false,

  createNewCalculator: (name: string) => {
    const config: CalculatorConfig = {
      id: nanoid(),
      name,
      description: '',
      blocks: createDefaultBlocks(),
      variables: {},
      theme: DEFAULT_THEME,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set({ calculator: config, variables: {}, selectedBlockId: null });
  },

  loadCalculator: (config: CalculatorConfig) => {
    const { engine } = get();

    // Initialize variables from input/slider blocks
    const variables: Record<string, number> = {};
    config.blocks.forEach(block => {
      if (block.type === 'input' || block.type === 'slider') {
        const inputBlock = block as InputBlock | SliderBlock;
        variables[inputBlock.variableName] = inputBlock.defaultValue;
      }
    });

    engine.setVariables(variables);
    set({ calculator: config, variables, selectedBlockId: null });
  },

  addBlock: (type: Block['type']) => {
    const { calculator } = get();
    if (!calculator) return;

    const order = calculator.blocks.length;
    let newBlock: Block;

    switch (type) {
      case 'text':
        newBlock = {
          id: nanoid(),
          type: 'text',
          order,
          content: 'Neuer Text',
          size: 'body',
        } as TextBlock;
        break;

      case 'input':
        const inputVarName = `input_${nanoid(6)}`;
        newBlock = {
          id: nanoid(),
          type: 'input',
          order,
          label: 'Neues Eingabefeld',
          variableName: inputVarName,
          defaultValue: 100,
          suffix: '',
          min: 0,
          max: 1000,
        } as InputBlock;
        // Initialize variable
        get().setVariable(inputVarName, 100);
        break;

      case 'slider':
        const sliderVarName = `slider_${nanoid(6)}`;
        newBlock = {
          id: nanoid(),
          type: 'slider',
          order,
          label: 'Neuer Slider',
          variableName: sliderVarName,
          defaultValue: 50,
          min: 0,
          max: 100,
          step: 1,
          suffix: '',
        } as SliderBlock;
        get().setVariable(sliderVarName, 50);
        break;

      case 'result':
        newBlock = {
          id: nanoid(),
          type: 'result',
          order,
          label: 'Ergebnis',
          formula: '0',
          format: 'number',
          size: 'medium',
          color: 'default',
        } as ResultBlock;
        break;

      case 'chart':
        newBlock = {
          id: nanoid(),
          type: 'chart',
          order,
          title: 'Vergleich',
          chartType: 'area',
          dataFormula: '',
          beforeLabel: 'Vorher',
          afterLabel: 'Nachher',
        } as ChartBlock;
        break;

      case 'comparison':
        newBlock = {
          id: nanoid(),
          type: 'comparison',
          order,
          title: 'Vergleich',
          rows: [
            {
              id: nanoid(),
              label: 'Wert 1',
              beforeFormula: '0',
              afterFormula: '0',
              format: 'number',
            },
          ],
        } as ComparisonBlock;
        break;

      default:
        return;
    }

    set({
      calculator: {
        ...calculator,
        blocks: [...calculator.blocks, newBlock],
        updatedAt: new Date(),
      },
      selectedBlockId: newBlock.id,
    });
  },

  updateBlock: (id: string, updates: Partial<Block>) => {
    const { calculator, engine, variables } = get();
    if (!calculator) return;

    const updatedBlocks = calculator.blocks.map(block => {
      if (block.id !== id) return block;

      const updatedBlock = { ...block, ...updates } as Block;

      // Handle variable name changes for input/slider blocks
      if (
        (block.type === 'input' || block.type === 'slider') &&
        'variableName' in updates
      ) {
        const oldBlock = block as InputBlock | SliderBlock;
        const newVarName = (updates as InputBlock | SliderBlock).variableName;

        if (oldBlock.variableName !== newVarName) {
          // Remove old variable
          const newVariables = { ...variables };
          delete newVariables[oldBlock.variableName];

          // Add new variable
          newVariables[newVarName] = oldBlock.defaultValue;
          engine.setVariables(newVariables);
          set({ variables: newVariables });
        }
      }

      // Handle default value changes
      if (
        (block.type === 'input' || block.type === 'slider') &&
        'defaultValue' in updates
      ) {
        const inputBlock = block as InputBlock | SliderBlock;
        const newValue = (updates as InputBlock | SliderBlock).defaultValue;
        get().setVariable(inputBlock.variableName, newValue);
      }

      return updatedBlock;
    });

    set({
      calculator: {
        ...calculator,
        blocks: updatedBlocks,
        updatedAt: new Date(),
      },
    });
  },

  deleteBlock: (id: string) => {
    const { calculator, variables, engine } = get();
    if (!calculator) return;

    // Find the block to remove
    const blockToRemove = calculator.blocks.find(b => b.id === id);

    // If it's an input/slider, remove the variable
    if (blockToRemove && (blockToRemove.type === 'input' || blockToRemove.type === 'slider')) {
      const inputBlock = blockToRemove as InputBlock | SliderBlock;
      const newVariables = { ...variables };
      delete newVariables[inputBlock.variableName];
      engine.setVariables(newVariables);
      set({ variables: newVariables });
    }

    const filteredBlocks = calculator.blocks
      .filter(b => b.id !== id)
      .map((b, i) => ({ ...b, order: i }));

    set({
      calculator: {
        ...calculator,
        blocks: filteredBlocks,
        updatedAt: new Date(),
      },
      selectedBlockId: null,
    });
  },

  reorderBlocks: (activeId: string, overId: string) => {
    const { calculator } = get();
    if (!calculator) return;

    const blocks = [...calculator.blocks];
    const activeIndex = blocks.findIndex(b => b.id === activeId);
    const overIndex = blocks.findIndex(b => b.id === overId);

    if (activeIndex === -1 || overIndex === -1) return;

    // Remove and insert at new position
    const [removed] = blocks.splice(activeIndex, 1);
    blocks.splice(overIndex, 0, removed);

    // Update order property
    const reorderedBlocks = blocks.map((b, i) => ({ ...b, order: i }));

    set({
      calculator: {
        ...calculator,
        blocks: reorderedBlocks,
        updatedAt: new Date(),
      },
    });
  },

  selectBlock: (id: string | null) => {
    set({ selectedBlockId: id });
  },

  setVariable: (name: string, value: number) => {
    const { engine, variables } = get();
    engine.setVariable(name, value);
    set({ variables: { ...variables, [name]: value } });
  },

  togglePreviewMode: () => {
    set(state => ({ isPreviewMode: !state.isPreviewMode, selectedBlockId: null }));
  },

  evaluate: (formula: string) => {
    const { engine } = get();
    return engine.evaluate(formula);
  },

  updateTheme: (updates: Partial<ThemeConfig>) => {
    const { calculator } = get();
    if (!calculator) return;

    set({
      calculator: {
        ...calculator,
        theme: { ...calculator.theme, ...updates },
        updatedAt: new Date(),
      },
    });
  },

  getEmbedCode: () => {
    const { calculator } = get();
    if (!calculator) return '';

    // Generate embed iframe code
    const baseUrl = window.location.origin;
    return `<iframe
  src="${baseUrl}/embed/${calculator.id}"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; border-radius: 12px;"
></iframe>`;
  },

  exportConfig: () => {
    const { calculator } = get();
    if (!calculator) return '';
    return JSON.stringify(calculator, null, 2);
  },
}));

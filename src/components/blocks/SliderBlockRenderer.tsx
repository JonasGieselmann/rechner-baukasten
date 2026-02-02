import { useEffect } from 'react';
import type { SliderBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';

interface Props {
  block: SliderBlock;
}

export function SliderBlockRenderer({ block }: Props) {
  const { variables, setVariable } = useCalculatorStore();

  const value = variables[block.variableName] ?? block.defaultValue;

  // Initialize variable with default value on mount
  useEffect(() => {
    if (variables[block.variableName] === undefined) {
      setVariable(block.variableName, block.defaultValue);
    }
  }, [block.variableName, block.defaultValue, variables, setVariable]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVariable(block.variableName, Number(e.target.value));
  };

  return (
    <div className="bg-[#10131c] rounded-2xl p-5 border border-[#1a1f2e] hover:border-[#2a3142] transition-colors">
      <div className="flex justify-between items-baseline mb-3">
        <label className="text-sm text-[#b8c7d9]">{block.label}</label>
        <span className="text-xl font-semibold text-white">
          {value}{block.suffix}
        </span>
      </div>
      <input
        type="range"
        min={block.min}
        max={block.max}
        step={block.step}
        value={value}
        onChange={handleChange}
        className="w-full"
      />
    </div>
  );
}

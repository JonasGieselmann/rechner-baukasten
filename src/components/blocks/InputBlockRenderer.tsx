import { useEffect } from 'react';
import type { InputBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';

interface Props {
  block: InputBlock;
}

export function InputBlockRenderer({ block }: Props) {
  const { variables, setVariable } = useCalculatorStore();

  const value = variables[block.variableName] ?? block.defaultValue;

  // Initialize variable with default value on mount
  useEffect(() => {
    if (variables[block.variableName] === undefined) {
      setVariable(block.variableName, block.defaultValue);
    }
  }, [block.variableName, block.defaultValue, variables, setVariable]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.max(
      block.min,
      Math.min(block.max, Number(e.target.value) || 0)
    );
    setVariable(block.variableName, newValue);
  };

  return (
    <div className="bg-[#10131c] rounded-2xl p-5 border border-[#1a1f2e] hover:border-[#2a3142] transition-colors">
      <label className="block text-sm text-[#b8c7d9] mb-2">{block.label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          min={block.min}
          max={block.max}
          className="w-full bg-[#1a1f2e] rounded-lg py-3 px-4 text-white font-medium
                     border border-[#2a3142] focus:border-[#a6daff] focus:ring-1
                     focus:ring-[#a6daff]/30 outline-none transition-all
                     [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                     [&::-webkit-inner-spin-button]:appearance-none"
          style={{ paddingRight: block.suffix ? '3.5rem' : '1rem' }}
        />
        {block.suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b7a90]">
            {block.suffix}
          </span>
        )}
      </div>
    </div>
  );
}

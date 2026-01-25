import type { InputBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';

interface Props {
  block: InputBlock;
}

export function InputBlockRenderer({ block }: Props) {
  const { variables, setVariable } = useCalculatorStore();

  const value = variables[block.variableName] ?? block.defaultValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.max(
      block.min,
      Math.min(block.max, Number(e.target.value) || 0)
    );
    setVariable(block.variableName, newValue);
  };

  return (
    <div className="bg-[#12121a] rounded-xl p-4 border border-[#1f1f2e]">
      <label className="block text-sm text-gray-400 mb-2">{block.label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={handleChange}
          min={block.min}
          max={block.max}
          className="w-full bg-[#1a1a24] rounded-lg py-3 px-4 text-white font-medium
                     border border-[#2a2a3a] focus:border-[#7EC8F3] focus:ring-1
                     focus:ring-[#7EC8F3]/30 outline-none transition-all"
        />
        {block.suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
            {block.suffix}
          </span>
        )}
      </div>
    </div>
  );
}

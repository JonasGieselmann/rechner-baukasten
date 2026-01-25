import type { SliderBlock } from '../../types';
import { useCalculatorStore } from '../../store/calculatorStore';

interface Props {
  block: SliderBlock;
}

export function SliderBlockRenderer({ block }: Props) {
  const { variables, setVariable } = useCalculatorStore();

  const value = variables[block.variableName] ?? block.defaultValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVariable(block.variableName, Number(e.target.value));
  };

  return (
    <div className="bg-[#12121a] rounded-xl p-4 border border-[#1f1f2e]">
      <div className="flex justify-between items-baseline mb-3">
        <label className="text-sm text-gray-400">{block.label}</label>
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
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>{block.min}{block.suffix}</span>
        <span>{block.max}{block.suffix}</span>
      </div>
    </div>
  );
}

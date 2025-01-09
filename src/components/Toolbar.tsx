import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Circle, Minus, MousePointer2, Square } from "lucide-react";
import { Tools } from "./Canvas";

interface ToolbarProps {
  setElementType: (elementType: Tools) => void;
  onClick: () => void;
}

const Toolbar = ({ setElementType, onClick }: ToolbarProps) => {
  const [selectedTool, setSelectedTool] = useState<Tools>(Tools.line);

  const handleValueChange = (value: string | null) => {
    if (!value) {
      setSelectedTool(Tools.select);
      setElementType(Tools.select);
    } else {
      setSelectedTool(value as Tools);
      setElementType(value as Tools);
    }
  };

  return (
    <ToggleGroup
      type="single"
      size={"lg"}
      className="shadow-md p-1 rounded-md z-50"
      value={selectedTool}
      onValueChange={handleValueChange}
      onClick={onClick}
    >
      <ToggleGroupItem value={Tools.rectangle} className="">
        <Square />
      </ToggleGroupItem>
      <ToggleGroupItem value={Tools.line} className="">
        <Minus />
      </ToggleGroupItem>
      <ToggleGroupItem value={Tools.ellipse} className="">
        <Circle />
      </ToggleGroupItem>
      <ToggleGroupItem value={Tools.select} className="">
        <MousePointer2 />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default Toolbar;

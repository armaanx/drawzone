import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tools } from "@/types/canvasTypes";
import {
  Circle,
  Minus,
  MousePointer2,
  Pencil,
  Square,
  Trash2,
} from "lucide-react";
import { useState } from "react";

interface ToolbarProps {
  setElementType: (elementType: Tools) => void;
  onClick: () => void;
  clear: () => void;
}

const Toolbar = ({ setElementType, onClick, clear }: ToolbarProps) => {
  const [selectedTool, setSelectedTool] = useState<Tools>(Tools.pen);

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
      className="border shadow-md p-2 px-4 rounded-full z-50 bg-background"
      value={selectedTool}
      onValueChange={handleValueChange}
      onClick={onClick}
    >
      <ToggleGroupItem value={Tools.pen} className="">
        <Pencil />
      </ToggleGroupItem>
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
      <ToggleGroupItem
        value="clear"
        onClick={() => {
          clear();
          setElementType(Tools.pen);
          setSelectedTool(Tools.pen);
        }}
        className=""
      >
        <Trash2 />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};

export default Toolbar;

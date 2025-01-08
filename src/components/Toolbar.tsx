import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Circle, Minus, Square } from "lucide-react";
import { ElementType } from "./Canvas";
interface ToolbarProps {
  setElementType: (elementType: ElementType) => void;
}
const Toolbar = ({ setElementType }: ToolbarProps) => {
  return (
    <ToggleGroup
      type="single"
      size={"lg"}
      className="shadow-md p-1 rounded-md"
      defaultValue="line"
      onValueChange={(value) => setElementType(value as ElementType)}
    >
      <ToggleGroupItem value={ElementType.rectangle} className="">
        <Square />
      </ToggleGroupItem>
      <ToggleGroupItem value={ElementType.line} className="">
        <Minus />
      </ToggleGroupItem>
      <ToggleGroupItem value={ElementType.circle} className="">
        <Circle />
      </ToggleGroupItem>
    </ToggleGroup>
  );
};
export default Toolbar;

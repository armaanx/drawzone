import { Element } from "@/types/canvasTypes";
import { useState, useCallback } from "react";

interface HistoryState {
  currentElements: Element[];
  setState: (
    action: Array<Element> | ((prev: Element[]) => Element[]),
    overwrite?: boolean
  ) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

const useHistory = (initialState: Element[] = []): HistoryState => {
  const [history, setHistory] = useState<Array<Element[]>>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const setState = useCallback(
    (
      action: Array<Element> | ((prev: Element[]) => Element[]),
      overwrite: boolean = false
    ) => {
      setHistory((prevHistory) => {
        const currentState = prevHistory[currentIndex];
        const newState =
          typeof action === "function" ? action(currentState) : action;

        if (overwrite) {
          // Replace current state while preserving past states
          const newHistory = [...prevHistory.slice(0, currentIndex + 1)];
          newHistory[currentIndex] = newState;
          return newHistory;
        } else {
          // Add new state and clear any future states (redo stack)
          const newHistory = [
            ...prevHistory.slice(0, currentIndex + 1),
            newState,
          ];
          setCurrentIndex(currentIndex + 1);
          return newHistory;
        }
      });
    },
    [currentIndex]
  );

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, history.length]);

  const clear = useCallback(() => {
    setHistory([[]]);
    setCurrentIndex(0);
  }, []);

  return {
    currentElements: history[currentIndex] || [],
    setState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    clear,
  };
};

export default useHistory;

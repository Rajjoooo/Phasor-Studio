import { create } from 'zustand'

export type Tool =
  | 'select'
  | 'draw'
  | 'move'
  | 'vertex'
  | 'pan'
  | 'approach'
  | 'intersection'
  | 'delete'

type ToolStore = {
  activeTool: Tool
  setTool: (tool: Tool) => void
}

export const useToolStore = create<ToolStore>((set) => ({
  activeTool: 'pan',

  setTool: (tool) =>
    set({ activeTool: tool }),
}))
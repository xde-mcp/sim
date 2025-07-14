import { create } from 'zustand'

interface BlockDetailsState {
  selectedBlockId: string | null
  isOpen: boolean
  selectBlock: (blockId: string | null) => void
  closeDetails: () => void
}

export const useBlockDetailsStore = create<BlockDetailsState>((set) => ({
  selectedBlockId: null,
  isOpen: false,
  selectBlock: (blockId) =>
    set({
      selectedBlockId: blockId,
      isOpen: blockId !== null,
    }),
  closeDetails: () =>
    set({
      selectedBlockId: null,
      isOpen: false,
    }),
}))

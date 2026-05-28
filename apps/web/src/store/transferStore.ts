import { create } from "zustand"

interface TransferStoreState {
  reset: () => void
}

export const useTransferStore = create<TransferStoreState>(() => ({
  reset: () => {},
}))

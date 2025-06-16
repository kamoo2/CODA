import { create } from 'zustand';

interface MenuStore {
  currentHeader: string;
  selectedMenu: string;
  selectedKey: string;
  setSelectedMenu: (label: string, key: string) => void;
  setCurrentHeader: (title: string) => void;
}

export const useMenuStore = create<MenuStore>((set) => ({
  selectedMenu: 'Dashboard',
  selectedKey: 'dashboard',
  currentHeader: 'Dashboard',
  setCurrentHeader: (title) => set({ currentHeader: title }),
  setSelectedMenu: (label, key) => set({ selectedMenu: label, selectedKey: key }),
}));

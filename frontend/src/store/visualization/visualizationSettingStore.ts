import { create } from 'zustand';
import { UploadFileDto } from '@/types/storage';

type BlueprintSetting = {
  uploadFile: UploadFileDto;
  entityName: string;
  viewName: string;
};

export type SelectedSignal = {
  messageName: string;
  signalNames: string[];
};

export type RiffSignalSetting = {
  uploadFile: UploadFileDto;
  isDbcLoaded: boolean;
  treeData: any[]; // Ant Design TreeNode[]
  checkedKeys: React.Key[];
  expandedKeys: React.Key[];
  selectedSignals: SelectedSignal[];
  searchKeyword: string;
};

interface VisualizationSettingStore {
  // Common
  currentStep: number;
  setCurrentStep: (step: number) => void;
  validationMessage: string | null;
  setValidationMessage: (msg: string | null) => void;
  validateProjectName: () => void;
  validateBlueprintSettings: () => void;

  // Step 1 : Project Setup
  projectName: string;
  setProjectName: (name: string) => void;

  // Step 2 : Configure Blueprints
  blueprintSettings: BlueprintSetting[];
  setBlueprintSettings: (settings: BlueprintSetting[]) => void;

  // Step 3 : Select Signals
  riffSignalSettings: Record<string, RiffSignalSetting>;
  getRiffFiles: () => BlueprintSetting[];
  // 초기 상태 생성 함수
  initRiffSetting: (UploadFile: UploadFileDto) => void;
  setRiffTreeData: (fileId: string, treeData: any[]) => void;
  setCheckedKeys: (fileId: string, checked: React.Key[]) => void;
  setExpandedKeys: (fileId: string, expanded: React.Key[]) => void;
  setSelectedSignals: (fileId: string, signals: SelectedSignal[]) => void;
  setSearchKeyword: (fileId: string, keyword: string) => void;
  setIsDbcLoaded: (fileId: string) => void;
  removeRiffSignalSettings: (fileId: string) => void;

  resetAll: () => void;
}

export const useVisualizationSettingStore = create<VisualizationSettingStore>((set, get) => ({
  currentStep: 0,
  setCurrentStep: (step) => set({ currentStep: step }),
  validationMessage: null,
  setValidationMessage: (msg) => set({ validationMessage: msg }),
  validateProjectName: () => {
    const { projectName } = get();
    if (projectName.trim().length === 0) {
      set({ validationMessage: 'Project Name cannot be empty.' });
    } else {
      set({ validationMessage: null });
    }
  },
  validateBlueprintSettings: () => {
    const { blueprintSettings } = get();
    if (blueprintSettings.length === 0) {
      set({ validationMessage: 'At least one blueprint must be registered.' });
    } else if (
      blueprintSettings.some(
        (setting) => setting.entityName.trim().length === 0 || setting.viewName.trim().length === 0,
      )
    ) {
      set({ validationMessage: 'All blueprints must have both Entity Name and View Name filled out.' });
    } else {
      set({ validationMessage: null });
    }
  },

  projectName: '',
  setProjectName: (name) => {
    set({ projectName: name });
    get().validateProjectName();
  },

  blueprintSettings: [],
  setBlueprintSettings: (settings) => {
    set({ blueprintSettings: settings });
    get().validateBlueprintSettings();
  },

  riffSignalSettings: {},
  getRiffFiles: () => {
    return get()
      .blueprintSettings.filter((bp) => bp.uploadFile.parserName === 'RiffParser')
      .sort((a, b) => a.uploadFile.name.localeCompare(b.uploadFile.name));
  },
  initRiffSetting: (uploadFile) =>
    set((state) => {
      if (state.riffSignalSettings[uploadFile.id]) return state; // 이미 있으면 스킵

      return {
        riffSignalSettings: {
          ...state.riffSignalSettings,
          [uploadFile.id]: {
            uploadFile,
            isDbcLoaded: false,
            dbcFileName: state.riffSignalSettings[uploadFile.id]?.uploadFile.dbcFileName ?? null,
            searchKeyword: '',
            treeData: [],
            checkedKeys: [],
            expandedKeys: [],
            selectedSignals: [],
          },
        },
      };
    }),
  setRiffTreeData: (fileId, treeData) =>
    set((state) => ({
      riffSignalSettings: {
        ...state.riffSignalSettings,
        [fileId]: {
          ...(state.riffSignalSettings[fileId] ?? {
            fileId,
            dbcFileName: null,
            treeData: [],
            checkedKeys: [],
            expandedKeys: [],
            selectedSignals: [],
          }),
          treeData,
        },
      },
    })),
  setCheckedKeys: (fileId, checkedKeys) =>
    set((state) => ({
      riffSignalSettings: {
        ...state.riffSignalSettings,
        [fileId]: {
          ...(state.riffSignalSettings[fileId] ?? {}),
          checkedKeys,
        },
      },
    })),
  setExpandedKeys: (fileId, expandedKeys) =>
    set((state) => ({
      riffSignalSettings: {
        ...state.riffSignalSettings,
        [fileId]: {
          ...(state.riffSignalSettings[fileId] ?? {}),
          expandedKeys,
        },
      },
    })),
  setSearchKeyword: (fileId: string, keyword: string) =>
    set((state) => ({
      riffSignalSettings: {
        ...state.riffSignalSettings,
        [fileId]: {
          ...state.riffSignalSettings[fileId],
          searchKeyword: keyword,
        },
      },
    })),
  setSelectedSignals: (fileId, selectedSignals) =>
    set((state) => ({
      riffSignalSettings: {
        ...state.riffSignalSettings,
        [fileId]: {
          ...(state.riffSignalSettings[fileId] ?? {}),
          selectedSignals,
        },
      },
    })),
  setIsDbcLoaded: (fileId: string) =>
    set((state) => ({
      riffSignalSettings: {
        ...state.riffSignalSettings,
        [fileId]: {
          ...(state.riffSignalSettings[fileId] ?? {}),
          isDbcLoaded: true,
        },
      },
    })),
  removeRiffSignalSettings: (fileId) =>
    set((state) => {
      const { [fileId]: _, ...rest } = state.riffSignalSettings;
      return {
        riffSignalSettings: rest,
      };
    }),
  resetAll: () =>
    set({
      currentStep: 0,
      projectName: '',
      validationMessage: null,
      blueprintSettings: [],
      riffSignalSettings: {},
    }),
}));

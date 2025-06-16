import { create } from 'zustand';
import { storageService } from '@/apis/services/storageService';
import systemService from '@/apis/services/systemService';
import { Bucket } from '@/types/storage';
import { ParserDto } from '@/types/system';
import { SelectedFileWithParserAndDbc } from '@/types/storage';
type StorageStore = {
  bucketList: Bucket[] | null;
  bucketDetails: Bucket | null;
  bucketId: string;
  fetchBucketList: () => Promise<void>;
  fetchBucketDetails: (bucketId: string) => Promise<void>;
  clear: () => void;
  selectedFiles: SelectedFileWithParserAndDbc[];
  setSelectedFiles: (files: SelectedFileWithParserAndDbc[]) => void;
  setBucketId: (id: string) => void;
};

export const useStorageStore = create<StorageStore>((set) => ({
  bucketList: null,
  bucketDetails: null,
  selectedFiles: [], //  초기값
  bucketId: '',

  setBucketId: (id: string) => set({ bucketId: id }),

  setSelectedFiles: (files: SelectedFileWithParserAndDbc[]) => set({ selectedFiles: files }),

  fetchBucketList: async () => {
    try {
      const res = await storageService.getMyStorageBucketsList();
      set({ bucketList: res.result });
    } catch (error) {
      console.error('Error fetching bucket list:', error);
    }
  },

  fetchBucketDetails: async (bucketId: string) => {
    try {
      const res = await storageService.getBucketDetails({ bucketId });
      set({ bucketDetails: res.result });
    } catch (error) {
      console.error('Error fetching bucket details:', error);
    }
  },

  clear: () => set({ bucketList: null, bucketDetails: null, selectedFiles: [], bucketId: '' }), // ✅ 초기화 시 selectedFiles도 같이
}));

interface StorageFilterState {
  filterMode: 'all' | 'uploaded';
  setFilterMode: (mode: 'all' | 'uploaded') => void;
}

export const useStorageFilterStore = create<StorageFilterState>((set) => ({
  filterMode: 'all',
  setFilterMode: (mode) => set({ filterMode: mode }),
}));

interface ParserStore {
  parsers: ParserDto[];
  fetchParsers: () => Promise<void>;
}

export const useParserStore = create<ParserStore>((set) => ({
  parsers: [],
  fetchParsers: async () => {
    try {
      const res = await systemService.getSupportedParsers();
      if (res.success) {
        set({ parsers: res.result });
      } else {
        console.error('파서 목록 실패:', res.message);
      }
    } catch (err) {
      console.error('파서 목록 오류:', err);
    }
  },
}));

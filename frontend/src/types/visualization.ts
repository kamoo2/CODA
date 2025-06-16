import { SelectedSignal } from '@/store/visualization/visualizationSettingStore';
import { UploadFileDto } from '@/types/storage';

// Enum
export enum EBlueprintVisualizationStatus {
  NEEDS_VISUALIZATION = 'NEEDS_VISUALIZATION',
  REUSE_EXISTING = 'REUSE_EXISTING',
}

export enum EVisualizationProcessStatus {
  NOT_STARTED = 'NOT_STARTED',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
}

// Request
export interface CreateProjectBlueprintSettingRequest {
  uploadFileId: string;
  uploadFilePath: string;
  entityName: string;
  viewName: string;
  dbcFileName: string | null;
  parserName: string;
  selectedSignals: SelectedSignal[] | null;
}

export interface StartVisualizationRequest {
  projectId: string;
  blueprints: CreateProjectBlueprintSettingRequest[];
}

export interface CreateProjectRequest {
  projectName: string;
  blueprints: CreateProjectBlueprintSettingRequest[];
}

// Response
export interface RRDFile {
  id: string;
  rrdUrl: string;
  name: string;
}

export interface VisualizationProject extends SimpleVisualizationProject {
  rrdFiles: RRDFile[];
  blueprintSettings: BlueprintSetting[];
}

export interface SimpleVisualizationProject {
  id: string;
  name: string;
  status: EVisualizationProcessStatus;
  createdAt: string;
}
export interface BlueprintSetting {
  id?: string;
  viewName: string;
  entityName: string;
  uploadFile: UploadFileDto;
}

export interface Signal {
  name: string;
  startBit: number;
  length: number;
  factor: number;
  offset: number;
  unit: string;
}

export interface Message {
  id: number;
  name: string;
  dlc: number;
  signals: Signal[];
}

export interface RiffFileSetting {
  bp: BlueprintSetting;
  dbcPath: string | null;
  messages: Message[];
}

export interface BlueprintVisualizationStatus {
  visualizedProject: SimpleVisualizationProject | null;
  status: EBlueprintVisualizationStatus;
}

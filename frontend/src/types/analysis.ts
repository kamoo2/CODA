// 프로젝트 데이터를 담는 클래스(DB에서 정보를 받아 해당 객체 생성)
export interface EvalProjectDto {
  id: string;
  createdAt: string;
  name: string;
  analysisDate: string;
  owner: string;
  description: string;
  passEvalEnabled: boolean;
  scoreEvalEnabled: boolean;
  taggingEnabled: boolean;
}

// eval_project_file 을 통해 file table에서 가져온 데이터
export interface ProjectFileDto {
  id: string;
  projectId: string;
  uploadFileId: string;
  uploadFileName: string;
  uploadFilePath: string;
}

// 기준 설정 타입
export enum CRITERIA_TYPE {
  NONE,
  PASS,
  SCORE,
  TAGGING,
}

// 기준 설정 타입
export enum CRITERIA_STATE {
  NONE = 'NONE',
  RUNNING = 'RUNNING',
  COMPLETE = 'COMPLETE',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

// 평가 프로젝트 기준 연결 테이블
export interface EvalProjectCriteriaDto {
  id: string;
  createdAt: string;
  projectId: string;
  criteriaId: string;
  criteriaName: string;
  type: CRITERIA_TYPE;
  state: CRITERIA_STATE;
  tagColor: string;
}

// 기준 연결 테이블과 합격 여부 판정 결과 테이블을 join 하여 얻은 데이터
export interface PassEvalResultDto {
  id: string;
  criteriaId: string;
  criteriaName: string;
  failStartTime: string;
  failEndTime: string;
  failMessage: string;
}

// 기준 연결 테이블과 점수 산정 결과 테이블을 join 하여 얻은 데이터
export interface ScoreEvalResultDto {
  id: string;
  criteriaId: string;
  criteriaName: string;
  startTime: string;
  endTime: string;
  score: number;
  message: string;
}

// 기준연결, 태깅결과, 태그 join
export interface TaggingResultDto {
  id: string;
  criteriaId: string;
  criteriaName: string;
  startTime: string;
  endTime: string;
  message: string;
  color: string;
}

// 데이터셋 구축 프로젝트
export interface CurationProjectDto {
  id: string;
  createdAt: string;
  name: string;
  analysisDate: string;
  owner: string;
  description: string;
}

// 데이터 큐레이션 프로젝트 기준 연결 테이블
export interface CurationProjectCriteriaDto {
  id: string;
  createdAt: string;
  projectId: string;
  criteriaId: string;
  criteriaName: string;
  state: CRITERIA_STATE;
  projectFileId: string;
  uploadFileName: string;
  uploadFileExtension: string;
}

// 데이터 큐레이션 결과
export interface CurationResultDto {
  id: string;
  projectCriteriaId: string;
  criteriaName: string;
  startTime: string;
  endTime: string;
  uploadFileName: string;
  uploadFileExtension: string;
}

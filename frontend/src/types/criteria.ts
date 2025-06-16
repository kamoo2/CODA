export interface VariableDto {
  name: string;
  path: string;
  id: string;
}

export interface CriteriaDto {
  name: string;
  createdAt: string;
  type: string;
  variables: VariableDto[];
  id: string;
}

// 쿼리 조건
export type QueryCondition = {
  field: string;
  operator: string;
  value: string;
  logicalOp: string;
};

// 쿼리 그룹
export type QueryGroup = {
  conditions: QueryCondition[];
  groupLogicalOp: string;
};

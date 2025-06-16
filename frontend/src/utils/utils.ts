import { DataNode } from 'antd/es/tree';
import { TaskDto } from '@/types/task';
import taskService from '@/apis/services/taskService';
import { Message } from '@/types/visualization';
import { TreeNode } from '@/types/common';
import { CriteriaDto, QueryCondition, QueryGroup } from '@/types/criteria';

export const getFileExtension = (fileName: string) => fileName.split('.').pop();

const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const getSegmentTimeRange = (index: number, total: number, totalSeconds: number) => {
  const startMin = index * 60;
  const endSec = index === total - 1 ? totalSeconds : (index + 1) * 60;

  const startStr = formatTime(startMin);
  const endStr = formatTime(endSec);

  return `${startStr} ~ ${endStr}`;
};

// task 로 관리될 대상이 시작하면 호출되는 함수
export const startTask = async (task: TaskDto) => {
  const response = await taskService.saveTask(task);
  return response;
};

export const getAllKeys = (nodes: DataNode[]): string[] => {
  const keys: string[] = [];
  const traverse = (items: DataNode[]) => {
    items.forEach((item) => {
      keys.push(item.key as string);
      if (item.children) traverse(item.children);
    });
  };
  traverse(nodes);
  return keys;
};

// baseName을 기반으로 nodes 에 포함되지 않은 기준 이름을 만들어 주는 함수.
// baseName뒤에 숫자를 증가시키며 검사하여 생성한다.
export function generateUniqueCriteriaName(baseName: string, nodes: TreeNode<CriteriaDto>[]): string {
  const existingNames = new Set<string>();

  // 모든 파일 노드(=CriteriaDto 포함)에서 name 추출
  const extractNames = (tree: TreeNode[]) => {
    tree.forEach((node) => {
      if ('isLeaf' in node && node.isLeaf && node.metadata) {
        existingNames.add(node.metadata.name);
      } else if ('children' in node && Array.isArray(node.children)) {
        extractNames(node.children);
      }
    });
  };

  extractNames(nodes);

  // 고유 이름 생성
  if (!existingNames.has(baseName)) return baseName;

  let index = 1;
  let candidate = `${baseName}${index}`;
  while (existingNames.has(candidate)) {
    index += 1;
    candidate = `${baseName}${index}`;
  }

  return candidate;
}
export function parseQuery(query: string): QueryGroup[] {
  const groupRegex = /\(([^)]+)\)/g;
  const groups: QueryGroup[] = [];
  let match;
  let lastGroupEndIdx = 0;

  while ((match = groupRegex.exec(query)) !== null) {
    const groupStr = match[1];
    const groupStartIdx = match.index;
    const groupEndIdx = groupRegex.lastIndex;

    // 그룹 앞쪽의 논리 연산자 (AND, OR)
    const groupLogicalOp = findGroupLogicalOpBefore(query, lastGroupEndIdx, groupStartIdx);

    // 그룹 내 조건 분리
    const parts = groupStr
      .split(/\b(AND|OR)\b/)
      .map((s) => s.trim())
      .filter((s) => s !== '');
    const conditions: QueryCondition[] = [];

    let currentLogicalOp = '';

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === 'AND' || part === 'OR') {
        currentLogicalOp = part;
      } else {
        const conditionMatch = part.match(/^(\w+)\s*(=|!=|>|<|>=|<=)\s*(.+)$/);
        if (conditionMatch) {
          const [, field, operator, value] = conditionMatch;
          conditions.push({
            field,
            operator,
            value,
            logicalOp: currentLogicalOp,
          });
          currentLogicalOp = '';
        }
      }
    }

    groups.push({
      conditions,
      groupLogicalOp,
    });

    lastGroupEndIdx = groupEndIdx;
  }

  return groups;
}

// 그룹 앞쪽에서 논리 연산자 찾기
function findGroupLogicalOpBefore(query: string, fromIdx: number, toIdx: number): string {
  const substring = query.slice(fromIdx, toIdx).trim();
  const match = substring.match(/\b(AND|OR)\s*$/);
  return match ? match[1] : '';
}

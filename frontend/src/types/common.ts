export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  result: T; // 성공 응답일 경우 `data`가 있을 수도 있고 없을 수도 있음
  errorCode: string; // 실패 응답일 경우에만 존재
}

// 폴더 인터페이스 (`isLeaf` 없음, `metadata` 없음)
export interface FolderNode {
  title: string;
  key: string;
  children: TreeNode[]; // 폴더는 자식 노드를 포함 가능
}

// 파일 인터페이스 (`isLeaf: true`, `metadata` 필수)
export interface FileNode<T = any> {
  title: string;
  key: string;
  isLeaf: true;
  metadata: T; // ✅ metadata를 다양한 타입으로 지원
}

// ✅ TreeNode는 `폴더` 또는 `파일`
export type TreeNode<T = any> = FolderNode | FileNode<T>;

export function isFileNode<T = any>(node: TreeNode<T>): node is FileNode<T> {
  return (node as FileNode<T>).isLeaf === true;
}

export function convertToTreeNodes(data: TreeNode[]): TreeNode[] {
  return data.map((item) => {
    if (isFileNode(item)) {
      return item;
    }

    return {
      title: item.title,
      key: item.key,
      children: convertToTreeNodes(item.children || []),
    };
  });
}

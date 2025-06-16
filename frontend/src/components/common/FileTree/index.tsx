import { ConfigProvider, Tree } from 'antd';
import { Key, useState } from 'react';
import styles from './index.module.scss';
import { TreeNode } from '@/types/common';

interface FileTreeProps {
  treeData: TreeNode[];
  multiple?: boolean;
  onExpand: (expandedKeys: Key[], info: { node: TreeNode; expanded: boolean }) => void;
  onSelect: (selectedKeys: Key[], info: { node: TreeNode }) => void;
  selectedKeys?: Key[];
  expandedKeys?: Key[];
}

const FileTree = ({ treeData, multiple = false, onExpand, onSelect, selectedKeys, expandedKeys }: FileTreeProps) => {
  return (
    <div className={styles.fileTreeContainer}>
      <ConfigProvider
        theme={{
          components: {
            Tree: {
              colorBgContainer: '$101010',
              colorText: '#ffffff',
              directoryNodeSelectedBg: '#003da1',
              titleHeight: 27,
              indentSize: 20,
              borderRadius: 2,
            },
          },
        }}
      >
        <Tree.DirectoryTree
          multiple={multiple}
          onSelect={onSelect}
          onExpand={onExpand}
          treeData={treeData}
          {...(expandedKeys && { expandedKeys })} // ✅
          {...(selectedKeys && { selectedKeys })}
        />
      </ConfigProvider>
    </div>
  );
};

export default FileTree;

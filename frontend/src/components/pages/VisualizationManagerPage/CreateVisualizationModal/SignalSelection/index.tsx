import { Key, useEffect, useMemo, useRef, useState } from 'react';
import { DataNode } from 'antd/es/tree';
import Tree from 'antd/es/tree/Tree';
import { ConfigProvider, theme } from 'antd';
import { FaFileAlt } from 'react-icons/fa';
import styles from './index.module.scss';
import { SelectedSignal, useVisualizationSettingStore } from '@/store/visualization/visualizationSettingStore';
import systemService from '@/apis/services/systemService';
import { Message } from '@/types/visualization';

const SignalSelection = () => {
  const [selectedRiffId, setSelectedRiffId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const selectedRiff = useVisualizationSettingStore((state) =>
    selectedRiffId ? state.riffSignalSettings[selectedRiffId] : null,
  );
  const {
    blueprintSettings,
    riffSignalSettings,
    setSearchKeyword,
    initRiffSetting,
    setRiffTreeData,
    setCheckedKeys,
    setExpandedKeys,
    setSelectedSignals,
    setIsDbcLoaded,
    getRiffFiles,
  } = useVisualizationSettingStore();

  const riffFiles = useMemo(() => {
    return getRiffFiles();
  }, [blueprintSettings]);

  useEffect(() => {
    if (riffFiles.length === 0) return;

    // 1. initRiffSetting: 모든 riff 파일에 대해 초기화
    for (const riff of riffFiles) {
      initRiffSetting(riff.uploadFile);
    }

    // 2. 첫 번째 파일 자동 선택 (단, selectedRiff가 아직 없다면)
    const firstId = riffFiles[0].uploadFile.id;
    if (!selectedRiff && riffSignalSettings[firstId]) {
      setSelectedRiffId(firstId);
    }
  }, [riffFiles, riffSignalSettings]);

  useEffect(() => {
    const loadDbc = async () => {
      if (!selectedRiffId) return;

      const riff = riffSignalSettings[selectedRiffId];
      if (!riff || riff.isDbcLoaded || !riff.uploadFile.dbcFileName || !riff.uploadFile.dbcFileId) return;

      try {
        setIsLoading(true);
        console.log('📥 DBC 파일 로딩 중:', riff.uploadFile.dbcFileName);
        const response = await systemService.parsingDbcFile(riff.uploadFile.id);

        if (!response.success) {
          throw new Error('DBC 파일 로딩 실패: ' + response.message);
        }

        const parsed: Message[] = response.result;

        setExpandedKeys(
          selectedRiffId,
          parsed.map((msg) => `msg-${msg.id}`),
        );

        const treeData: DataNode[] = parsed.map((msg) => ({
          title: msg.name,
          key: `msg-${msg.id}`,
          children: msg.signals.map((sig) => ({
            title: sig.name,
            key: `sig-${msg.id}-${sig.name}`,
            isLeaf: true,
          })),
        }));

        setRiffTreeData(selectedRiffId, treeData);
        setIsDbcLoaded(selectedRiffId);
      } catch (err) {
        console.error('❌ DBC 파일 로딩 실패:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDbc();
  }, [selectedRiffId, riffSignalSettings]);

  const filterTreeData = (nodes: DataNode[], keyword: string): DataNode[] => {
    return nodes
      .map((node) => {
        const titleStr = String(node.title).toLowerCase();
        const matchedChildren = node.children ? filterTreeData(node.children as DataNode[], keyword) : [];

        if (titleStr.includes(keyword.toLowerCase()) || matchedChildren.length > 0) {
          return {
            ...node,
            children: matchedChildren,
          };
        }

        return null;
      })
      .filter(Boolean) as DataNode[];
  };

  const filteredTreeData = useMemo(() => {
    if (!selectedRiff?.treeData) return [];
    return filterTreeData(selectedRiff.treeData, selectedRiff.searchKeyword);
  }, [selectedRiff?.treeData, selectedRiff?.searchKeyword]);

  const handleCheck = (checked: Key[] | { checked: Key[]; halfChecked: Key[] }) => {
    const checkedArray = Array.isArray(checked) ? checked : checked.checked;
    if (!selectedRiff) return;
    const riffId = selectedRiff.uploadFile.id;
    setCheckedKeys(riffId, checkedArray);

    const selectedSignals: SelectedSignal[] = [];

    for (const messageNode of selectedRiff.treeData) {
      if (!messageNode.children) continue;

      const checkedSignalNames = (messageNode.children as DataNode[])
        .filter((sigNode: DataNode) => checkedArray.includes(sigNode.key))
        .map((sigNode: DataNode) => sigNode.title as string);

      if (checkedSignalNames.length > 0) {
        selectedSignals.push({
          messageName: messageNode.title as string,
          signalNames: checkedSignalNames,
        });
      }
    }

    setSelectedSignals(riffId, selectedSignals);
  };

  const handleExpand = (expanded: Key[]) => {
    if (!selectedRiff) return;
    const riffId = selectedRiff.uploadFile.id;
    setExpandedKeys(riffId, expanded);
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <div className={styles.riffList}>
          {riffFiles.map((riff) => {
            const isSelected = selectedRiff?.uploadFile.id === riff.uploadFile.id;
            return (
              <div
                key={riff.uploadFile.id}
                className={`${styles.riffItem} ${isSelected ? styles.selected : ''}`}
                onClick={() => setSelectedRiffId(riff.uploadFile.id)}
              >
                <div className={styles.itemCard}>
                  <FaFileAlt className={styles.icon} />
                  <div>
                    <div className={styles.riffName}>{riff.uploadFile.name}</div>
                    <div className={styles.dbcName}>
                      Linked DBC: <span>{riff.uploadFile.dbcFileName?.split('/').pop()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {isLoading ? (
          <div className={styles.loadingSection}>
            <div className={styles.loading}>🔄 DBC 파싱 중 ...</div>
          </div>
        ) : (
          <div className={styles.riffSetting}>
            <div className={styles.searchSection}>
              <input
                type="text"
                placeholder="Search signals..."
                value={selectedRiff?.searchKeyword}
                onChange={(e) => {
                  if (selectedRiffId) {
                    setSearchKeyword(selectedRiffId, e.target.value);
                  }
                }}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.treeSection}>
              <ConfigProvider
                theme={{
                  algorithm: theme.darkAlgorithm,
                  token: { colorPrimary: '#08f', borderRadius: 8 },
                }}
              >
                <Tree
                  checkable
                  treeData={filteredTreeData}
                  onCheck={handleCheck}
                  checkedKeys={selectedRiff?.checkedKeys}
                  onExpand={handleExpand}
                  expandedKeys={selectedRiff?.expandedKeys}
                />
              </ConfigProvider>
            </div>
          </div>
        )}
      </div>
      <div className={styles.rightSection}>
        {Object.entries(riffSignalSettings).map(([riffId, setting]) => {
          const riffName = riffFiles.find((r) => r.uploadFile.id === riffId)?.uploadFile.name || riffId;
          return (
            <div key={riffId} className={styles.messageGroup}>
              <div className={styles.riffHeader}>🎞 {riffName}</div>
              {setting.selectedSignals.map((msg, idx) => (
                <div key={idx} className={styles.messageBlock}>
                  <div className={styles.messageHeader}>🧩 {msg.messageName}</div>
                  <div className={styles.signalList}>
                    {msg.signalNames.map((name) => (
                      <div key={name} className={styles.signalItem}>
                        📶 {name}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SignalSelection;

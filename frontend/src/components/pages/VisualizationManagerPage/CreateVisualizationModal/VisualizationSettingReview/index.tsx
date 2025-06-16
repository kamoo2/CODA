import { useEffect, useMemo, useState } from 'react';
import styles from './index.module.scss';
import { getSegmentTimeRange } from '@/utils/utils';
import visualizationService from '@/apis/services/visualizationService';
import { SimpleVisualizationProject } from '@/types/visualization';
import { useVisualizationSettingStore } from '@/store/visualization/visualizationSettingStore';

const VisualizationSettingReview = () => {
  const { projectName, blueprintSettings, riffSignalSettings } = useVisualizationSettingStore();
  const [loading, setLoading] = useState(false);
  const [visualizedProject, setVisualizedProject] = useState<SimpleVisualizationProject | null>(null); // 시각화된 프로젝트 정보
  // const longestTimestamp = useMemo(
  //   () => Math.max(...blueprintSettings.map((bp) => bp.uploadFile.timestamp || 0)),
  //   [blueprintSettings],
  // );

  useEffect(() => {
    const checkVisualization = async () => {
      setLoading(true);
      const response = await visualizationService.checkUsedBlueprintSettings(
        blueprintSettings.map((bp) => {
          if (bp.uploadFile.parserName === 'RiffParser') {
            return {
              uploadFileId: bp.uploadFile.id,
              uploadFilePath: bp.uploadFile.s3Url,
              entityName: bp.entityName,
              viewName: bp.viewName,
              dbcFileName: bp.uploadFile.dbcFileName,
              parserName: bp.uploadFile.parserName,
              selectedSignals: riffSignalSettings[bp.uploadFile.id].selectedSignals,
            };
          } else {
            return {
              uploadFileId: bp.uploadFile.id,
              uploadFilePath: bp.uploadFile.s3Url,
              entityName: bp.entityName,
              viewName: bp.viewName,
              dbcFileName: null,
              parserName: bp.uploadFile.parserName,

              selectedSignals: [],
            };
          }
        }),
      );
      if (response.success) {
        setVisualizedProject(response.result.visualizedProject);
      } else {
      }

      setLoading(false);
    };

    checkVisualization();
  }, [blueprintSettings]);

  // const renderRrdBlocks = (count: number, totalUs: number) => {
  //   const MAX_VISIBLE = 8;
  //   const totalSeconds = totalUs / 1_000_000;

  //   const visible = count > MAX_VISIBLE ? MAX_VISIBLE - 2 : count;
  //   const hiddenStart = visible;
  //   const hiddenEnd = count - 1;

  //   return (
  //     <div className={styles.rrdBlockRow}>
  //       {Array.from({ length: visible }).map((_, i) => (
  //         <div key={i} className={styles.rrdBlock}>
  //           {getSegmentTimeRange(i, count, totalSeconds)}
  //         </div>
  //       ))}
  //       {count > MAX_VISIBLE && (
  //         <div className={styles.rrdEllipsis}>
  //           <span className={styles.rrdEllipsisText}>... {hiddenEnd - hiddenStart} segments skipped ...</span>
  //         </div>
  //       )}
  //       {count > MAX_VISIBLE && (
  //         <div className={styles.rrdBlock}>{getSegmentTimeRange(count - 1, count, totalSeconds)}</div>
  //       )}
  //     </div>
  //   );
  // };

  if (loading) return <div className={styles.loading}>불러오는 중...</div>;
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Project Setting Summary</h2>

      <div className={styles.projectBox}>
        <strong className={styles.projectLabel}>Project Name:</strong>
        <span className={styles.projectValue}>{projectName || '-'}</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.reviewTable}>
          <thead className={styles.tableHeader}>
            <tr className={styles.tableRow}>
              <th className={styles.tableHeaderCell}>File Name</th>
              <th className={styles.tableHeaderCell}>Entity</th>
              <th className={styles.tableHeaderCell}>Parser</th>
            </tr>
          </thead>
          <tbody className={styles.tableBody}>
            {blueprintSettings.map((setting, idx) => (
              <tr key={idx} className={styles.tableRow}>
                <td className={styles.tableCell}>{setting.uploadFile.name}</td>
                <td className={styles.tableCell}>{setting.entityName || '-'}</td>
                <td className={styles.tableCell}>{setting.uploadFile.parserName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visualizedProject ? (
        <div className={styles.summaryBox}>
          <div className={styles.summaryTitle}>✅ A project with these blueprints already exists.</div>
        </div>
      ) : (
        <div className={styles.summaryBox}>
          <div className={styles.summaryTitle}>⚠️ No project exists with these blueprints.</div>
        </div>
      )}
    </div>
  );
};
export default VisualizationSettingReview;

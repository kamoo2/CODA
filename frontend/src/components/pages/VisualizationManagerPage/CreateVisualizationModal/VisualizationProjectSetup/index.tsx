import { FaFileAlt } from 'react-icons/fa';
import { MdTimer } from 'react-icons/md';
import styles from './index.module.scss';
import { useVisualizationSettingStore } from '@/store/visualization/visualizationSettingStore';

const VisualizationProjectSetup = () => {
  const { projectName, setProjectName, validationMessage } = useVisualizationSettingStore();

  return (
    <div className={styles.container}>
      {/* 입력 필드 카드 */}
      <div className={styles.inputCard}>
        <label htmlFor="projectName">Project Name</label>
        <input
          id="projectName"
          type="text"
          placeholder="Enter your project name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
        />
        {validationMessage && <div style={{ color: 'red' }}>{validationMessage}</div>}
      </div>

      {/* Info 영역 */}
      <div className={styles.infoCard}>
        <div className={styles.infoContent}>
          <FaFileAlt className={styles.icon} />
          <div>
            <h3>What is a Blueprint?</h3>
            <p>
              A <strong>Blueprint</strong> links uploaded files to the visualization system. You define which file
              represents which sensor or signal and how it should appear.
            </p>
          </div>
        </div>
      </div>

      {/* 예시 카드 */}
      <div className={styles.exampleCards}>
        <div className={styles.exampleCard}>
          <div className={styles.filename}>lidar.pcap</div>
          <div className={styles.mapping}>
            <span>LidarEntity</span> → <span>LidarView</span>
          </div>
        </div>
        <div className={styles.exampleCard}>
          <div className={styles.filename}>gps.pcap</div>
          <div className={styles.mapping}>
            <span>GpsEntity</span> → <span>GpsView</span>
          </div>
        </div>
        <div className={styles.exampleCard}>
          <div className={styles.filename}>ccan.riff</div>
          <div className={styles.mapping}>
            <span>CcanEntity</span> → <span>GrpahView</span>
          </div>
        </div>
      </div>

      {/* 시각화 설명 */}
      <div className={styles.segmentCard}>
        <MdTimer className={styles.icon} />
        <div>
          <strong>Visualization is performed in 1-minute segments.</strong>
          <p>RRD files are generated per minute to allow scalable and synchronized playback.</p>
        </div>
      </div>
    </div>
  );
};

export default VisualizationProjectSetup;

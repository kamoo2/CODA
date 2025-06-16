import { useEffect, useState } from 'react';
import styles from './index.module.scss';
import { UploadFileDto } from '@/types/storage';
import { FileExtensionDto, ParserDto } from '@/types/system';
import storageService from '@/apis/services/storageService';
import systemService from '@/apis/services/systemService';
import Select from '@/components/common/Select';
import { useVisualizationSettingStore } from '@/store/visualization/visualizationSettingStore';

const ConfigureBlueprintSettings = () => {
  const [uploadFiles, setUploadFiles] = useState<UploadFileDto[]>([]);

  const [extensions, setExtensions] = useState<FileExtensionDto[]>([]);
  const [parsers, setParsers] = useState<ParserDto[]>([]);
  const [selectedExt, setSelectedExt] = useState<FileExtensionDto>(); // 선택된 확장자
  const [selectedParser, setSelectedParser] = useState<ParserDto>(); // 선택된 파서
  const [filterTags, setFilterTags] = useState<FilterTag[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    validationMessage,
    blueprintSettings,
    setBlueprintSettings,
    validateBlueprintSettings,
    removeRiffSignalSettings,
  } = useVisualizationSettingStore();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [filesResponse, extensionsResponse, parsersResponse] = await Promise.all([
          storageService.getUploadFiles(),
          systemService.getSupportedExtensions(),
          systemService.getSupportedParsers(),
        ]);
        console.log('filesResponse', filesResponse);

        setUploadFiles(filesResponse.result);
        setExtensions(extensionsResponse.result);
        setParsers(parsersResponse.result);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const availableExtensions = extensions.filter(
    (ext) => !filterTags.some((tag) => tag.type === 'extension' && tag.value.id === ext.id),
  );

  const availableParsers = parsers.filter(
    (parser) => !filterTags.some((tag) => tag.type === 'parser' && tag.value.id === parser.id),
  );

  const handleChangeExtension = (ext: FileExtensionDto) => {
    setSelectedExt(undefined);
    setFilterTags([...filterTags, { type: 'extension', value: ext }]);
  };

  const handleChangeParser = (parser: ParserDto) => {
    setSelectedParser(undefined);
    setFilterTags([...filterTags, { type: 'parser', value: parser }]);
  };

  const handleAddToBlueprint = (uploadFile: UploadFileDto) => {
    console.log('handleAddToBlueprint', uploadFile);
    setBlueprintSettings([
      {
        uploadFile,
        entityName: uploadFile.name.split('.')[0],
        viewName: uploadFile.parserName,
      },
      ...blueprintSettings,
    ]);

    validateBlueprintSettings();
  };

  const handleRemoveSetting = (uploadFileId: string) => {
    setBlueprintSettings(blueprintSettings.filter((item) => item.uploadFile.id !== uploadFileId));
    removeRiffSignalSettings(uploadFileId);
    validateBlueprintSettings();
  };

  const remainingUploadFiles = uploadFiles.filter(
    (file) => !blueprintSettings.some((setting) => setting.uploadFile.id === file.id),
  );

  const handleChange = (tempId: string, key: 'entityName' | 'viewName', value: string) => {
    const updated = blueprintSettings.map((item) => (item.uploadFile.id === tempId ? { ...item, [key]: value } : item));
    setBlueprintSettings(updated);
    validateBlueprintSettings();
  };

  if (loading) return <div className={styles.loading}>불러오는 중...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.containerWrapper}>
        <div className={styles.blueprintSettingSection}>
          <div>Upload File</div>
          <div className={styles.filtersControls}>
            <input className={styles.searchInput} placeholder="Search..." />
            <div className={styles.filterSelection}>
              <Select<FileExtensionDto>
                options={availableExtensions}
                value={selectedExt}
                onChange={handleChangeExtension}
                getLabel={(ext) => ext.name}
                isEqual={(a, b) => a.id === b.id}
                placeholder="extensions"
              />
              <Select<ParserDto>
                options={availableParsers}
                value={selectedParser}
                onChange={handleChangeParser}
                getLabel={(parser) => parser.name}
                isEqual={(a, b) => a.id === b.id}
                placeholder="parsers"
              />
            </div>
          </div>
          {filterTags.length > 0 && (
            <div className={styles.activeFilterTags}>
              {filterTags.map((tag) => (
                <div
                  key={tag.value.id}
                  className={styles.tag}
                  onClick={() => setFilterTags(filterTags.filter((deleteTag) => tag.value.id !== deleteTag.value.id))}
                >
                  {tag.value.name}
                </div>
              ))}
            </div>
          )}
          <div className={styles.uploadFileList}>
            {remainingUploadFiles.map((file) => (
              <div key={file.id} className={styles.uploadFileItem} onClick={() => handleAddToBlueprint(file)}>
                <span className={styles.uploadFileName}>{file.name}</span>
                <span>{file.parserName}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.blueprintSettingSection}>
          <h2>Blueprint Setting</h2>
          <div className={styles.blueprintSettingList}>
            {blueprintSettings.map((setting) => (
              <div key={setting.uploadFile.id} className={styles.settingItem}>
                <div className={styles.topInfo}>
                  <span>{setting.uploadFile.name}</span>
                  <button className={styles.removeButton} onClick={() => handleRemoveSetting(setting.uploadFile.id)}>
                    ✕
                  </button>
                </div>
                <div className={styles.cardInput}>
                  <label className={styles.label}>Entity Name</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={setting.entityName}
                    onChange={(e) => handleChange(setting.uploadFile.id, 'entityName', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {validationMessage && <div style={{ color: 'red' }}>{validationMessage}</div>}
    </div>
  );
};

type FilterTag = {
  type: 'extension' | 'parser';
  value: FileExtensionDto | ParserDto;
};

export default ConfigureBlueprintSettings;

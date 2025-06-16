import React, { useEffect, useState } from 'react';
import styles from './index.module.scss';
import ModuleManagerComponent from '@/components/pages/CriteriaManagerPage/PythonEditorComponent/EditorSettingsComponent/ModuleManagerComponent';
import PackageManagerComponent from '@/components/pages/CriteriaManagerPage/PythonEditorComponent/EditorSettingsComponent/PackageManagerComponent';
import ModalFrame from '@/components/common/Modal/ModalFrame';

interface Props {
  pyodide: any;
  title: string;
  description: string;
  onClose: () => void;
}

export default function EditorSettingsPage({ pyodide, title, description, onClose }: Props) {
  const [modules, setModules] = useState<string[]>([]);
  const [packages, setPackages] = useState<string[]>([]);
  const [output, setOutput] = useState<string>('');

  useEffect(() => {
    // localStorage에 저장된 모듈, 패키지 리스트로 아이템 리스트 초기화
    const savedModules = JSON.parse(localStorage.getItem('modules') || '[]');
    const savedPackages = JSON.parse(localStorage.getItem('packages') || '[]');
    setModules(savedModules);
    setPackages(savedPackages);
  }, [pyodide]);

  // modules 상태 변경 시 localStorage 반영
  useEffect(() => {
    localStorage.setItem('modules', JSON.stringify(modules));
  }, [modules]);

  // installedPackages 상태 변경 시 localStorage 반영
  useEffect(() => {
    localStorage.setItem('packages', JSON.stringify(packages));
  }, [packages]);

  // 동적 모듈 import 함수
  const importPythonModule = async (moduleName: string) => {
    try {
      // sys.path 확인
      await pyodide.runPythonAsync(`
import sys
if '/modules' not in sys.path:
    sys.path.append('/modules')
`);

      // 파일 존재 확인
      const files = await pyodide.runPythonAsync(`
import os
os.listdir('/modules')
`);
      // 여기서 파일이 없으면 문제는 FS write 실패
      if (!files.includes(`${moduleName}.py`)) {
        handleOutput(`❌ /modules 폴더에 ${moduleName}.py 없음`);
        return false;
      }

      // 모듈 캐시 삭제
      await pyodide.runPythonAsync(`
import sys
if '${moduleName}' in sys.modules:
    del sys.modules['${moduleName}']
`);

      // 동적 import
      await pyodide.runPythonAsync(`
import importlib
${moduleName} = importlib.import_module('${moduleName}')
`);

      handleOutput(`✅ ${moduleName} 모듈 import 성공`);
      return true;
    } catch (err) {
      console.error(`모듈 import 실패: ${moduleName}`, err);
      handleOutput(`❌ ${moduleName} 모듈 import 실패`);
      return false;
    }
  };

  // 로그 출력 함수
  const handleOutput = (msg: string) => setOutput((prev) => prev + msg + '\n');

  // 모듈 업로드 핸들러
  const handleModuleUpload = (fileName: string, fileData: Uint8Array) => {
    // 모듈 중복 등록 방지
    if (modules.includes(fileName)) {
      handleOutput(`⚠️ ${fileName} 파일은 이미 등록되어 있습니다.`);
      return;
    }

    // FS에 파일 저장
    pyodide.FS.writeFile(`/modules/${fileName}`, fileData);
    // modules 목록 갱신
    setModules((prev) => [...prev, fileName]);

    // localStorage에 파일 데이터 저장
    localStorage.setItem(`module_${fileName}`, JSON.stringify(Array.from(fileData)));

    handleOutput(`📂 ${fileName} 모듈 업로드 완료`);

    // 업로드 완료 후 import 시도
    const moduleName = fileName.replace('.py', '');
    importPythonModule(moduleName);
  };

  // 모듈 삭제 핸들러
  const handleModuleRemove = async (fileName: string) => {
    try {
      // 파일 시스템에서 삭제
      if (pyodide.FS.analyzePath(`/modules/${fileName}`).exists) {
        pyodide.FS.unlink(`/modules/${fileName}`);
      }
      // localStorage에서 파일 데이터 삭제
      localStorage.removeItem(`module_${fileName}`);

      // python import 삭제
      const moduleName = fileName.replace('.py', '');
      await pyodide.runPythonAsync(`
import sys
if '${moduleName}' in sys.modules:
    del sys.modules['${moduleName}']
`);

      // modules 상태 갱신
      setModules((prev) => prev.filter((m) => m !== fileName));
      handleOutput(`🗑️ ${fileName} 삭제 완료`);
    } catch (err) {
      console.error('삭제 실패', err);
      handleOutput(`❌ ${fileName} 삭제 실패`);
    }
  };

  // 패키지 설치 핸들러
  const handlePackageInstall = async (packageName: string) => {
    // 패키지 중복 설치 방지
    if (packages.includes(packageName)) {
      handleOutput(`⚠️ ${packageName} 패키지는 이미 설치되어 있습니다.`);
      return;
    }

    // 패키지 설치
    try {
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("${packageName}")
    `);

      // 패키지 목록 갱신
      setPackages((prev) => [...prev, packageName]);

      handleOutput(`✅ ${packageName} 설치 완료`);
    } catch (err: any) {
      handleOutput(`❌ 설치 실패: ${err}`);
    }
  };

  // 패키지 삭제 핸들러
  const handlePackageRemove = async (packageName: string) => {
    try {
      // pyodide에서 패키지 제거
      await pyodide.runPythonAsync(`
import sys
import importlib

if '${packageName}' in sys.modules:
    del sys.modules['${packageName}']

importlib.invalidate_caches()
    `);

      // pyodide.loadedPackages 갱신
      delete pyodide.loadedPackages[packageName];

      // packages 상태 갱신
      setPackages((prev) => prev.filter((m) => m !== packageName));

      handleOutput(`🗑️ ${packageName} 삭제 완료`);
    } catch (err) {
      console.error('패키지 삭제 실패', err);
      handleOutput(`❌ ${packageName} 삭제 실패`);
    }
  };

  return (
    <>
      <ModalFrame
        title={title}
        description={description}
        width="90%"
        height="90%"
        type="info"
        onConfirm={onClose}
        onClose={onClose}
      >
        <div className={styles.container}>
          <div className={styles.contentContainer}>
            <ModuleManagerComponent
              modules={modules}
              onUploadModule={handleModuleUpload}
              onRemoveModlue={handleModuleRemove}
            />
            <PackageManagerComponent
              packages={packages}
              onInstallPackage={handlePackageInstall}
              onRemovePackage={handlePackageRemove}
            />
          </div>
          <div className={styles.logOutput}>
            <h4>Log</h4>
            <pre>{output}</pre>
          </div>
        </div>
      </ModalFrame>
    </>
  );
}

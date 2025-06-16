import React, { useState, useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import styles from './index.module.scss';
import { VariableDto } from '@/types/criteria';
import EditorSettingsPage from '@/components/pages/CriteriaManagerPage/PythonEditorComponent/EditorSettingsComponent';
import useModal from '@/hooks/useModal';

interface Props {
  code: string;
  onChange: (value: string) => void;
  variables: VariableDto[];
}

export default function PythonEditorComponent(props: Props) {
  const [output, setOutput] = useState<string>('');
  // 데이터 변수 목록 상태 저장
  const variableSuggestionsRef = useRef<string[]>([]);
  // 모달 관련 훅
  const [isOpen, handleClickModalOpen, handleClickModalClose] = useModal();

  const pyodideRef = useRef<any>(null);

  // variables가 변경될 때마다 Monaco에 suggestions를 업데이트
  useEffect(() => {
    if (props.variables) {
      const names = props.variables.map((v) => v.name);
      variableSuggestionsRef.current = names;
    }
  }, [props.variables]);

  // pyodide.js 로드 및 jedi 설치
  useEffect(() => {
    const initPyodide = async () => {
      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
      });

      pyodide.setStdout({
        batched: (data: string) => setOutput((prev) => prev + data),
      });
      pyodide.setStderr({
        batched: (data: string) => setOutput((prev) => prev + data),
      });

      await pyodide.loadPackage('micropip');
      pyodideRef.current = pyodide;

      // jedi 설치
      await pyodide.runPythonAsync(`
import micropip
await micropip.install('jedi')
    `);

      // /modules 폴더 없으면 생성
      if (!pyodide.FS.analyzePath('/modules').exists) {
        pyodide.FS.mkdir('/modules');
      }

      // sys.path 등록
      await pyodide.runPythonAsync(`
import sys
if '/modules' not in sys.path:
    sys.path.append('/modules')
    `);

      // 📂 localStorage에서 모듈 복원 및 동적 임포트
      const savedModules = JSON.parse(localStorage.getItem('modules') || '[]');

      for (const mod of savedModules) {
        const fileContent = localStorage.getItem(`module_${mod}`);
        if (fileContent) {
          const uint8Array = new Uint8Array(JSON.parse(fileContent));
          pyodide.FS.writeFile(`/modules/${mod}`, uint8Array);
          // 동적 임포트
          await pyodide.runPythonAsync(`
import importlib
import sys
if '${mod.replace('.py', '')}' in sys.modules:
    del sys.modules['${mod.replace('.py', '')}']
importlib.invalidate_caches()
import ${mod.replace('.py', '')}
        `);
        }
      }

      setOutput((prev) => prev + '📂 모듈 복원 완료\n');

      // 📂 localStorage에서 패키지 복원 및 설치
      const savedPackages = JSON.parse(localStorage.getItem('packages') || '[]');

      for (const packageName of savedPackages) {
        // 패키지 설치
        try {
          setOutput((prev) => prev + `📦 ${packageName} 설치 중...\n`);
          await pyodide.runPythonAsync(`
import micropip
await micropip.install("${packageName}")
    `);
          setOutput((prev) => prev + `✅ ${packageName} 설치 완료\n`);
        } catch (err: any) {
          setOutput((prev) => prev + `❌ 설치 실패: ${err}`);
        }
      }
      setOutput((prev) => prev + '📂 패키지 복원 완료\n');
      setOutput('✅ Editor 초기화 완료\n');
    };

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
    script.onload = initPyodide;
    document.body.appendChild(script);
  }, []);

  // Monaco Editor CompletionItemProvider
  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    monacoInstance.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: async (model, position) => {
        if (!pyodideRef.current) return { suggestions: [] };

        const codeUntilCursor = model.getValue();
        const line = position.lineNumber;
        const column = position.column - 1; // jedi는 0-indexed

        const script = `
import jedi

def get_completions(code, line, column):
    script = jedi.Script(code)
    completions = script.complete(line, column)
    return [c.name for c in completions]

get_completions(${JSON.stringify(codeUntilCursor)}, ${line}, ${column})
        `;
        try {
          const completions: string[] = await pyodideRef.current.runPythonAsync(script);
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // ✅ completions + 외부 variables 합치기 (중복 제거)
          const combinedSuggestions = Array.from(new Set([...completions, ...variableSuggestionsRef.current]));
          console.log('외부변수 : ' + variableSuggestionsRef.current);
          return {
            suggestions: combinedSuggestions.map((c: string) => ({
              label: c,
              kind: monacoInstance.languages.CompletionItemKind.Variable,
              insertText: c,
              range,
            })),
          };
        } catch (err) {
          console.error('Error in jedi completions:', err);
          return { suggestions: [] };
        }
      },
    });
  };

  const editorSettingsOnClick = async () => {
    handleClickModalOpen();
  };

  const runCode = async () => {
    if (!pyodideRef.current) return;
    try {
      setOutput('');
      let baseImports = `
import sys
import math

if '/modules' not in sys.path:
    sys.path.append('/modules')
`;
      // 데이터 변수 기본값 = []; 정의
      variableSuggestionsRef.current.forEach((variable) => {
        baseImports = baseImports + `${variable} = [];`;
      });
      await pyodideRef.current.runPythonAsync(baseImports + '\n' + props.code);

      const passResult = await pyodideRef.current.runPythonAsync('pass_eval()');
      setOutput((prev) => prev + `✅ pass_eval() → ${passResult}\n`);

      const scoreResult = await pyodideRef.current.runPythonAsync('scoring()');
      setOutput((prev) => prev + `✅ scoring() → ${scoreResult}\n`);

      const tagResult = await pyodideRef.current.runPythonAsync('tagging()');
      setOutput((prev) => prev + `✅ tagging() → ${tagResult}\n`);
    } catch (err: any) {
      setOutput((prev) => prev + err.toString());
    }
  };

  const handleOnChange = (value: string) => props.onChange(value);

  const handleClickClose = () => {
    // 모달을 Cancel했을 때 해야할 로직이 있다면 추가
    // 후에 반드시 모달을 닫는 메서드 호출
    handleClickModalClose();
  };

  return (
    <div className={styles.container}>
      <div className={styles.editorWrapper}>
        <Editor
          height="400px"
          defaultLanguage="python"
          value={props.code}
          onChange={(value) => handleOnChange(value || '')}
          onMount={handleEditorDidMount}
          theme="vs-dark"
        />
      </div>

      <div className={styles.controlBar}>
        <button className={styles.runButton} onClick={runCode}>
          Run
        </button>
        <button onClick={editorSettingsOnClick}>Settings</button>
      </div>

      {isOpen && (
        <EditorSettingsPage
          title="태깅 기준 설정"
          description="태깅을 위한 기준을 설정합니다."
          onClose={handleClickClose}
          pyodide={pyodideRef.current}
        />
      )}

      <div className={styles.output}>
        <h3>Output</h3>
        <pre>{output}</pre>
      </div>
    </div>
  );
}

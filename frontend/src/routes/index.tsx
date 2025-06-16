import { createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
//import { EvaluationAnalysisPage } from '@/pages/EvaluationAnalysisPage';
import VisualizationManagerPage from '@/pages/VisualizationManagerPage';
import VisualizationViewPage from '@/pages/VisualizationViewPage';
import StorageSettingPage from '@/pages/StorageSettingPage';
import StorageManagerpage from '@/pages/StorageManagerPage';
import PrivateRoute from '@/routes/PrivateRoute';
import PublicRoute from '@/routes/PublicRoute';
import CriteriaManagerPage from '@/pages/CriteriaManagerPage';
import UploadDataPage from '@/pages/UploadDataPage';
import { EvaluationAnalysisPage } from '@/pages/EvaluationAnalysisPage';
import { CurationPage } from '@/pages/CurationPage';
import StorageLayout from '@/layouts/StorageFetchWrapperLayout/index.module.sc';
import TaskManagerPage from '@/pages/TaskManagerPage';

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* 로그인 페이지는 보호하지 않음 (누구나 접근 가능) */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* 보호된 경로 (로그인 필요) */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="visualization-manager" element={<VisualizationManagerPage />} />
          <Route path="visualization-viewer/:projectId" element={<VisualizationViewPage />} />
          <Route path="storage" element={<StorageLayout />}>
            <Route path="manager" element={<StorageManagerpage />} />
            <Route path="setting" element={<StorageSettingPage />} />
            <Route path="upload-data-manager" element={<UploadDataPage />} />
          </Route>
          <Route path="task-manager" element={<TaskManagerPage />} />
          <Route path="log-manager" element={<HomePage />} />
          <Route path="license-setting" element={<HomePage />} />
          <Route path="tool-setting" element={<HomePage />} />
          <Route path="user-guide" element={<HomePage />} />
          <Route path="faq" element={<HomePage />} />
          <Route path="support-ticket" element={<HomePage />} />
          <Route path="analysis-condition" element={<CriteriaManagerPage />} />
          <Route path="analysis-results" element={<HomePage />} />
          <Route path="data-based-evaluation" element={<EvaluationAnalysisPage />} />
          <Route path="data-curation" element={<CurationPage />} />
        </Route>
      </Route>
    </>,
  ),
);

export default router;

import { Navigate, Outlet, useLocation } from 'react-router-dom';

const PrivateRoute = () => {
  const location = useLocation();
  const accessToken = localStorage.getItem('accessToken');

  if (!accessToken) {
    // ✅ 로그인 페이지로 이동할 때, 원래 가려던 경로를 상태로 넘긴다
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default PrivateRoute;

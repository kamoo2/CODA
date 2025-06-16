import { RouterProvider } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { useEffect } from 'react';
import router from '@/routes';
import { useMqttStore } from '@/store/mqttStore';
import { useVisualizationProjectStore } from '@/store/visualization/projectStore';
import { EVisualizationProcessStatus } from '@/types/visualization';

const App = () => {
  const { connect, subscribe } = useMqttStore();

  useEffect(() => {
    const userId = localStorage.getItem('userId') || 'anonymous';
    connect(userId);

    subscribe(`global/user/${userId}/visualization/complete`, (msg) => {
      const payload = JSON.parse(msg.toString());
      useVisualizationProjectStore
        .getState()
        .updateProjectStatus(payload.projectId, EVisualizationProcessStatus.COMPLETE);
      toast.success(payload.projectId);
      console.log('📨 메시지 수신됨:', payload);
    });
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer position="bottom-right" autoClose={2000} />
    </>
  );
};

export default App;

import { FaUser } from 'react-icons/fa';
import { FaBell } from 'react-icons/fa';
import { MdLogout } from 'react-icons/md';
import styles from './index.module.scss';
import { useMenuStore } from '@/store/menuStore';
import authService from '@/apis/services/authService';

const Header = () => {
  const { currentHeader } = useMenuStore(); // 현재 선택된 메뉴 가져오기
  const handleLogout = async () => {
    const response = await authService.logout();

    if (response.success) {
      console.log('로그아웃 성공:', response.message);

      localStorage.removeItem('accessToken'); //  Access Token 삭제
      localStorage.removeItem('userId');
      window.location.href = '/login'; // ✅ 강제 이동
    } else {
      console.error('로그아웃 실패:', response.message);
      alert('로그아웃에 실패했습니다. 다시 시도하세요.');
    }
  };
  return (
    <div className={styles.header}>
      <span className={styles.title}>{currentHeader}</span>
      <div className={styles.headerControlContainer}>
        <FaUser />
        <FaBell />
        <MdLogout onClick={handleLogout} />
      </div>
    </div>
  );
};

export default Header;

import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './index.module.scss';
import router from '@/routes';
import authService from '@/apis/services/authService';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from: Location })?.from?.pathname || '/';

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault(); //  폼 제출 방지

    const response = await authService.login({ email, password });
    console.log(response);
    if (response.success) {
      localStorage.setItem('accessToken', response.result.accessToken);
      localStorage.setItem('userId', response.result.userId);
      navigate(from, { replace: true });
    } else {
      console.error('로그인 실패:', response.message);
      alert('로그인에 실패했습니다. 이메일 또는 비밀번호를 확인하세요.');
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        <div className={styles.title}>CODA</div>
        {/* `onSubmit`을 사용하여 폼 제출을 처리 */}
        <form className={styles.form} onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className={styles.forgotPassword}>Forgot Password?</div>
          {/*  `type="submit"`으로 변경하여 폼 제출 처리 */}
          <button type="submit" className={styles.button}>
            Login
          </button>

          <hr className={styles.divider} />
          <div className={styles.signUp}>sign up</div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

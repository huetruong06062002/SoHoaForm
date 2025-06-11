import { Button, message } from 'antd';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const userInfo = localStorage.getItem('userInfo');
  const dispatch = useDispatch();

  console.log(userInfo);


  const handleLogin = () => {
    navigate('/login');
  };

  const handleHome = () => {
    navigate('/');
  };

  
  const handleLogout = async () => {
    try {
      await dispatch(logoutAsync()).unwrap();
      message.success('Đăng xuất thành công!');
      setRole('');
      setFormData({
        role: '',
        remember: false
      });
    } catch (err) {
      message.error('Đăng xuất thất bại!');
    }
  };


  return (
    <div style={{
      background: '#1890ff',
      padding: '12px 24px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      <div
        style={{
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}
        onClick={handleHome}
      >
        SoHoaForm
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span
          style={{
            color: 'white',
            cursor: 'pointer',
            opacity: location.pathname === '/' ? 1 : 0.8
          }}
          onClick={handleHome}
        >
          Trang chủ
        </span>
        {
          userInfo ? (
            <>
              <Button
                type="link"
                style={{
                  color: 'white',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={handleLogin}
              >
                🔓 Đăng nhập
              </Button>
            </>
          ) :
            (
              <>
                <Button
                  type="link"
                  style={{
                    color: 'white',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            )
        }
      </div>
    </div>
  );
};

export default Header; 
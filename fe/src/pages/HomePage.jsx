import { Card, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';

const { Title, Text } = Typography;

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div style={{
          background: '#f5f5f5',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          minHeight: 'calc(100vh - 48px)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <Title level={1} style={{ color: '#333', fontSize: '48px', marginBottom: '16px' }}>
              SoHoaForm
            </Title>
            <Text style={{ fontSize: '18px', color: '#666' }}>
              Ứng dụng số hóa biểu mẫu từ tài liệu Word
            </Text>
          </div>
        </div>
      </AppLayout>
    );
  }

  const cardVariants = {
    initial: { y: 0 },
    hover: { 
      y: -8,
      transition: {
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  return (
    <AppLayout>
      <div style={{
        background: '#f5f5f5',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        minHeight: 'calc(100vh - 48px)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <Title level={1} style={{ color: '#333', fontSize: '48px', marginBottom: '16px' }}>
            SoHoaForm
          </Title>
          <Text style={{ fontSize: '18px', color: '#666' }}>
            Ứng dụng số hóa biểu mẫu từ tài liệu Word
          </Text>
        </div>

        {/* Cards Container */}
        <div style={{
          display: 'flex',
          gap: '40px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          maxWidth: '1000px'
        }}>
          {/* Admin Card - Quản lý biểu mẫu */}
          {user?.role === 'admin' && (
            <motion.div
              variants={cardVariants}
              initial="initial"
              whileHover="hover"
            >
              <Card
                style={{
                  width: '400px',
                  height: '320px',
                  borderRadius: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  border: '1px solid #e8e8e8',
                  cursor: 'pointer'
                }}
                bodyStyle={{
                  padding: '48px 32px',
                  textAlign: 'center',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={() => navigate('/manage-form')}
              >
                <div>
                  <div style={{
                    fontSize: '64px',
                    color: '#1677ff',
                    marginBottom: '24px'
                  }}>
                    📊
                  </div>
                  <Title level={2} style={{ marginBottom: '16px', color: '#333', fontSize: '24px' }}>
                    Quản lý biểu mẫu
                  </Title>
                  <Text style={{ 
                    color: '#666',
                    fontSize: '16px',
                    lineHeight: '1.6'
                  }}>
                    Tạo, chỉnh sửa và quản lý các biểu mẫu trong hệ thống
                  </Text>
                </div>
                <Button
                  type="primary"
                  size="large"
                  style={{
                    background: '#1677ff',
                    borderColor: '#1677ff',
                    height: '48px',
                    fontWeight: 'bold',
                    fontSize: '16px'
                  }}
                >
                  ⚙️ Quản lý biểu mẫu
                </Button>
              </Card>
            </motion.div>
          )}

          {/* User Card - Điền biểu mẫu */}
          <motion.div
            variants={cardVariants}
            initial="initial"
            whileHover="hover"
          >
            <Card
              style={{
                width: '400px',
                height: '320px',
                borderRadius: '16px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                border: '1px solid #e8e8e8',
                cursor: 'pointer'
              }}
              bodyStyle={{
                padding: '48px 32px',
                textAlign: 'center',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onClick={() => navigate('/allForm')}
            >
              <div>
                <div style={{
                  fontSize: '64px',
                  color: '#52c41a',
                  marginBottom: '24px'
                }}>
                  📝
                </div>
                <Title level={2} style={{ marginBottom: '16px', color: '#333', fontSize: '24px' }}>
                  Điền biểu mẫu
                </Title>
                <Text style={{ 
                  color: '#666',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  marginBottom: '50px'
                }}>
                  Điền và nộp các biểu mẫu được số hóa
                </Text>
              </div>
              <Button
                type="primary"
                size="large"
                style={{
                  background: '#52c41a',
                  borderColor: '#52c41a',
                  height: '48px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  marginTop: '28px'
                }}
              >
                ✏️ Điền biểu mẫu
              </Button>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default HomePage; 
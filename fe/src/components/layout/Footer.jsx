const Footer = () => {
  return (
    <div style={{
      textAlign: 'left',
      padding: '20px 24px',
      color: '#666',
      fontSize: '12px',
      background: 'transparent',
      borderTop: '1px solid #f0f0f0',
      marginTop: 'auto'
    }}>
      © 2025 - SoHoaForm - {' '}
      <span style={{ 
        color: '#1890ff', 
        cursor: 'pointer',
        textDecoration: 'underline'
      }}>
        Privacy
      </span>
    </div>
  );
};

export default Footer; 
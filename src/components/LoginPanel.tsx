import React from 'react';

interface LoginPanelProps {
  mode?: 'desktop' | 'mobile';
}

const LoginPanel: React.FC<LoginPanelProps> = ({ mode = 'desktop' }) => {
  return (
    <div className={`login-panel ${mode}`}>
      <h1>Login ({mode})</h1>
      {/* Login form implementation */}
    </div>
  );
};

export default LoginPanel;

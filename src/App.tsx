import React, { useState } from 'react';
import { Login } from './components/Login';
import { InspectionWizard } from './components/InspectionWizard';
import { User } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased">
      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <InspectionWizard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginView } from './components/auth/LoginView';
import { Header } from './components/common/Header';
import { AdminPortal } from './components/admin/AdminPortal';
import { RetailerPortal } from './components/retailer/RetailerPortal';
import { DriverPortal } from './components/driver/DriverPortal';
import { DistributorPortal } from './components/distributor/DistributorPortal';
import { SyncService } from './services/syncService';
import { getTodayDateString } from './services/storage';

const MainContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  useEffect(() => {
    SyncService.initialize();
  }, []);

  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header
        selectedDate={selectedDate}
        onChangeDate={setSelectedDate}
      />

      <div className="flex-1">
        {currentUser.role === 'admin' && (
          <AdminPortal selectedDate={selectedDate} />
        )}
        {currentUser.role === 'retailer' && (
          <main className="p-3 sm:p-5">
            <RetailerPortal />
          </main>
        )}
        {currentUser.role === 'driver' && (
          <main className="p-3 sm:p-5">
            <DriverPortal />
          </main>
        )}
        {currentUser.role === 'distributor' && (
          <main className="p-3 sm:p-5">
            <DistributorPortal />
          </main>
        )}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

export default App;

import { Navigate, Route, Routes } from 'react-router-dom';

import { StartVerificationPage } from './pages/StartVerificationPage';
import { VerificationPage } from './pages/VerificationPage';

export function App() {
  return (
    <Routes>
      <Route element={<StartVerificationPage />} path="/" />
      <Route element={<VerificationPage />} path="/verifications/:id" />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}

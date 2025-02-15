import React from "react";
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import HomePage from "./pages/HomePage";
import BalancePage, { UserBalanceProvider } from "./pages/BalancePage";
import GamePage from "./pages/GamePage";
import ProfilePage from "./pages/ProfilePage";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { DataPrefetchProvider } from "./context/DataPrefetchContext"; // Добавлено
import WalletHandler from "./components/WalletHandler";

const App: React.FC = () => {

  return (
    <TonConnectUIProvider manifestUrl="https://raw.githubusercontent.com/porterest/wp-front/refs/heads/main/frontend/public/tonconnect-manifest.json">
      <AuthProvider>
        <UserBalanceProvider>
            <DataPrefetchProvider>
              <Router>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/home" />} />
                    <Route path="/home" element={<HomePage />} />
                    <Route path="/balance" element={<BalancePage />} />
                    <Route path="/game" element={<GamePage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                  </Routes>
                </Layout>
                <WalletHandler />
              </Router>
            </DataPrefetchProvider>
        </UserBalanceProvider>
      </AuthProvider>
    </TonConnectUIProvider>
  );
};

export default App;

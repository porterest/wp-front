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
import { CandleDataProvider } from "./context/CandleDataContext";
import { DataPrefetchProvider } from "./context/DataPrefetchContext"; // Добавлено
import WalletHandler from "./components/WalletHandler";
import SymbolSelector from "./components/SymbolSelector";
import Timer from "./components/Timer";

const App: React.FC = () => {
  return (
    <TonConnectUIProvider manifestUrl="https://raw.githubusercontent.com/porterest/wp-front/refs/heads/main/frontend/public/tonconnect-manifest.json">
      <UserBalanceProvider>
        <CandleDataProvider>
          <DataPrefetchProvider> {/* Оборачиваем в DataPrefetchProvider */}
            <Router>
              <Layout>
                <Timer onTimerEnd={() => console.log("Timer ended")} />
                <SymbolSelector onSymbolChange={(pair) => console.log("Symbol selected:", pair)} />
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
        </CandleDataProvider>
      </UserBalanceProvider>
    </TonConnectUIProvider>
  );
};

export default App;

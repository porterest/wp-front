import React from "react";
import {BrowserRouter as Router, Routes, Route, Navigate} from "react-router-dom";
import {TonConnectUIProvider} from "@tonconnect/ui-react";

import HomePage from "./pages/HomePage";
import BalancePage from "./pages/BalancePage";
import GamePage from "./pages/GamePage";
import ProfilePage from "./pages/ProfilePage";
import Layout from "./components/Layout";
import {CandleDataProvider} from "./context/CandleDataContext";
import {AuthProvider} from "./context/AuthContext"; // путь исправьте под ваш проект
import WalletHandler from "./components/WalletHandler"; // Предполагается, что вы создали такой компонент

const App: React.FC = () => {
    return (
        <TonConnectUIProvider
            manifestUrl="https://raw.githubusercontent.com/daria021/dummy/refs/heads/main/tonconnect-manifest.json"
        >
            <AuthProvider>
                <CandleDataProvider>
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
                </CandleDataProvider>
            </AuthProvider>
        </TonConnectUIProvider>
    );
};

export default App;

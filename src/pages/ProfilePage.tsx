import React from "react";
import { useTonConnectUI } from "@tonconnect/ui-react"; // Для работы с TonConnect UI

const ProfilePage: React.FC = () => {
    const depositAddress = "0x1234567890abcdef1234567890abcdef12345678";
    const rewardAddress = "0xabcdef1234567890abcdef1234567890abcdef12";

    const [tonConnectUI] = useTonConnectUI();

    // Функция для копирования в буфер обмена
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert("Address copied to clipboard!");
    };

    // Функция для изменения кошелька
    const changeWallet = async () => {
        try {
            // Отключаем текущий кошелек
            await tonConnectUI.disconnect();
            alert("Wallet disconnected. Please connect a new wallet.");

            // Открываем модальное окно для подключения нового кошелька
            tonConnectUI.openModal();
        } catch (error) {
            console.error("Failed to change wallet:", error);
            alert("Failed to change wallet. Please try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 space-y-6">
            {/* Логотип */}
            <div className="mt-6">
                <img src="/logo.svg" alt="Logo" className="w-40 h-40 shadow-lg" />
            </div>

            {/* Заголовок */}
            <h1 className="text-2xl font-bold text-center">Profile</h1>
            <p className="text-gray-400 text-center">
                Manage your account, addresses, and settings.
            </p>

            {/* Адрес для пополнения */}
            <section className="w-11/12 bg-gradient-to-r from-purple-600 to-purple-400 rounded-md shadow-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Deposit Address</h2>
                <p className="text-sm break-words">{depositAddress}</p>
                <button
                    onClick={() => copyToClipboard(depositAddress)}
                    className="w-full py-2 bg-purple-800 text-white font-bold rounded-md hover:bg-purple-700 transition-colors duration-300"
                >
                    Copy Address
                </button>
            </section>

            {/* Адрес для вознаграждений */}
            <section className="w-11/12 bg-gradient-to-r from-teal-600 to-teal-400 rounded-md shadow-lg p-6 space-y-4">
                <h2 className="text-lg font-semibold">Reward Address</h2>
                <p className="text-sm break-words">{rewardAddress}</p>
                <button
                    onClick={changeWallet}
                    className="w-full py-2 bg-teal-800 text-white font-bold rounded-md hover:bg-teal-700 transition-colors duration-300"
                >
                    Change Wallet
                </button>
            </section>
        </div>
    );
};

export default ProfilePage;

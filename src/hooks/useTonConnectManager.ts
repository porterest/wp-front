import { useTonWallet, useTonConnectUI } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";

interface UseTonConnectManagerReturn {
    wallet: ReturnType<typeof useTonWallet>; // Тип для кошелька
    openTonConnectModal: (payload: string) => Promise<ReturnType<typeof useTonWallet>>;
    loading: boolean;
    error: string | null;
}

export const useTonConnectManager = (): UseTonConnectManagerReturn => {
    const [tonConnectUI] = useTonConnectUI();
    const wallet = useTonWallet();
    const [connectedWallet, setConnectedWallet] = useState(wallet);
    const [loading, setLoading] = useState(false); // Состояние загрузки
    const [error, setError] = useState<string | null>(null); // Состояние ошибки

    useEffect(() => {
        setConnectedWallet(wallet); // Обновляем состояние при изменении wallet
    }, [wallet]);

    /**
     * Открытие модального окна TonConnect с передачей payload
     * @param payload - Данные TonProof
     */
    const openTonConnectModal = async (payload: string): Promise<ReturnType<typeof useTonWallet>> => {
        tonConnectUI.setConnectRequestParameters({
            state: "ready",
            value: { tonProof: payload },
        });

        setLoading(true); // Устанавливаем состояние загрузки
        setError(null); // Сбрасываем состояние ошибки

        try {
            await tonConnectUI.openModal(); // Открываем модальное окно

            // Ждём, пока wallet обновится
            const waitForWallet = (): Promise<ReturnType<typeof useTonWallet>> =>
                new Promise((resolve, reject) => {
                    const interval = setInterval(() => {
                        if (connectedWallet && connectedWallet.account?.address) {
                            clearInterval(interval);
                            resolve(connectedWallet);
                        }
                    }, 100);

                    setTimeout(() => {
                        clearInterval(interval);
                        reject(new Error("Wallet did not update in time."));
                    }, 5000);
                });

            return await waitForWallet();
        } catch (error) {
            console.error("[useTonConnectManager]: TonConnect modal error:", error);
            setError(error instanceof Error ? error.message : "Unknown error occurred");
            throw error; // Пробрасываем ошибку вверх
        } finally {
            setLoading(false); // Сбрасываем состояние загрузки
        }
    };

    return { wallet: connectedWallet, openTonConnectModal, loading, error };
};

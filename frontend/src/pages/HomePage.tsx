import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TonConnectButton,
  useTonConnectUI,
  useTonWallet,
} from "@tonconnect/ui-react";
import { useDataPrefetch } from "../context/DataPrefetchContext";
import { fetchTime, getPairs, getPayload } from "../services/api";

const HomePage: React.FC = () => {
  // const { wallet, openTonConnectModal } = useTonConnectManager();
  // const { isAuthenticated, loginWithProof } = useAuth();
  const tonWallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setData } = useDataPrefetch();

  useEffect(() => {
    const prefetchData = async () => {
      try {
        const [pairsResponse, timeResponse] = await Promise.all([
          getPairs(),
          fetchTime(),
        ]);

        const pairs = pairsResponse.map((pair) => ({
          value: pair.pair_id,
          label: pair.name,
        }));

        if (timeResponse.remaining_time_in_block === 0) {
          console.log(
            "Получено 0 для remaining_time_in_block, повторный запрос через 5 секунд..."
          );
          setTimeout(prefetchData, 5000); // Повторяем запрос через 5 секунд
          return;
        }

        setData({ pairs, time: timeResponse.remaining_time_in_block });
      } catch (error) {
        console.error("Ошибка при предзагрузке данных:", error);
      }
    };

    prefetchData();
  }, [setData]);


  // Проверка, если кошелек подключен, запускаем авторизацию
  useEffect(() => {
    // Устанавливаем состояние загрузки
    tonConnectUI.setConnectRequestParameters({ state: "loading" });
    const initTonConnect = async () => {
      try {
        const requestStorageAccess = async () => {
          if (document.requestStorageAccess) {
            try {
              await document.requestStorageAccess();
              console.log("Storage access granted!");
            } catch (error) {
              console.error("Storage access denied.", error);
            }
          } else {
            console.warn(
              "requestStorageAccess API is not supported in this browser.",
            );
          }
        };

        await requestStorageAccess();

        // Получаем tonProofPayload с бэкенда
        const tonProofPayload = await getPayload();

        if (tonProofPayload) {
          // Готовим параметры подключения с tonProof
          tonConnectUI.setConnectRequestParameters({
            state: "ready",
            value: { tonProof: tonProofPayload.payload },
          });
        } else {
          // Если proof не найден, убираем загрузку
          tonConnectUI.setConnectRequestParameters(null);
        }

        // // Слушаем изменения статуса подключения
        // tonConnectUI.onStatusChange(async (wallet) => {
        //   if (wallet && wallet.connectItems?.tonProof && "proof" in wallet.connectItems.tonProof) {
        //     // Проверяем tonProof на бэкенде
        //     const verificationData = {
        //       proof: wallet.connectItems.tonProof.proof,
        //       address: wallet.account?.address,
        //     };
        //
        //     try {
        //       const response = await apiClient.post("/auth/verify_payload", verificationData);
        //       const isValid = response.data?.isValid;
        //
        //       if (isValid) {
        //         // Авторизуем пользователя
        //         if (wallet.account) {
        //           await loginWithProof(wallet.account);
        //           alert("Authentication successful!");
        //           navigate("/game");
        //         }
        //       } else {
        //         throw new Error("Invalid tonProof data");
        //       }
        //     } catch (error) {
        //       console.error("Error verifying tonProof:", error);
        //       setError("Failed to verify wallet.");
        //     }
        //   }
        // });
      } catch (error) {
        console.error("[HomePage]: Error during initialization:", error);
        setError(
          error instanceof Error ? error.message : "Unknown error occurred.",
        );
      } finally {
        setLoading(false);
      }
    };

    initTonConnect();
  }, []);

  const handlePlayNow = async () => {
    console.log("Play Now");
    setLoading(true);
    setError(null);

    if (tonWallet) {
      navigate("/game");
      return;
    }
    else {
      await tonConnectUI.openModal();
    }

    try {
      // const payload = await TonProofService.getTonProofPayload();
      // console.log("[HomePage]: TonProof payload fetched:", payload);

      // const connectedWallet = await tonConnectUI.openModal();

      // if (!connectedWallet || !connectedWallet.account) {
      //   throw new Error("Wallet not connected or account data is missing.");
      // }
      //
      // // После подключения кошелька запускаем авторизацию
      // if (
      //     connectedWallet.connectItems?.tonProof &&
      //     "proof" in connectedWallet.connectItems.tonProof
      // ) {
      //   const tonProof = connectedWallet.connectItems.tonProof;
      //   const verificationData = {
      //     address: connectedWallet.account.address,
      //     network: connectedWallet.account.chain.toString(),
      //     public_key: connectedWallet.account.publicKey,
      //     proof: {
      //       timestamp: tonProof.proof.timestamp,
      //       domain: {
      //         LengthBytes: Number(tonProof.proof.domain.lengthBytes),
      //         value: tonProof.proof.domain.value,
      //       },
      //       payload: tonProof.proof.payload,
      //       signature: tonProof.proof.signature,
      //       state_init: connectedWallet.account.walletStateInit,
      //     },
      //   };
      //
      //   try {
      //     const response = await apiClient.post("/auth/verify_payload", verificationData);
      //     const isValid = response.data?.isValid;
      //
      //     if (isValid) {
      //       await loginWithProof(verificationData);
      //       alert("Authentication successful!");
      //       navigate("/game");
      //     } else {
      //       throw new Error("Invalid tonProof data");
      //     }
      //   } catch (error) {
      //     console.error("Error during Play Now authorization:", error);
      //     setError("Authentication failed.");
      //   }
      // }
    } catch (error) {
      console.error("[HomePage]: Error during Play Now flow:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  // useEffect(() => {
  //   tonConnectUI.onStatusChange(async (wallet) => {
  //     if (wallet && wallet.connectItems?.tonProof && "proof" in wallet.connectItems.tonProof) {
  //       // Проверяем tonProof на бэкенде
  //       const verificationData = {
  //         proof: wallet.connectItems.tonProof.proof,
  //         address: wallet.account?.address,
  //       };
  //
  //       try {
  //         const response = await apiClient.post("/auth/verify_payload", verificationData);
  //         const isValid = response.data?.isValid;
  //
  //         if (isValid) {
  //           // Авторизуем пользователя
  //           if (wallet.account) {
  //             await loginWithProof(wallet.account);
  //             alert("Authentication successful!");
  //             navigate("/game");
  //           }
  //         } else {
  //           throw new Error("Invalid tonProof data");
  //         }
  //       } catch (error) {
  //         console.error("Error verifying tonProof:", error);
  //         setError("Failed to verify wallet.");
  //       }
  //     }
  //   });
  // }, [tonConnectUI]);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-black text-white">
      {/* Логотип */}
      <div className="mt-10">
        <img src="/logo.png" alt="Widepiper Logo" className="w-40 h-20" />
      </div>

      {/* Приветствие */}
      <div className="text-center px-6 mt-2">
        <h2 className="text-2xl font-bold mb-3">Welcome to Widepiper!</h2>
        <p className="text-gray-300">
          Explore a new world of crypto gambling. Connect your wallet to get
          started.
        </p>
      </div>

      {/* Кнопки */}
      <div className="mt-4 mb-20 space-y-4 w-full px-6">
        {/* Ошибка */}
        {error && <p className="text-red-500">{error}</p>}

        {/* Кнопка TonConnect */}
        {!tonWallet && (
          <div className="flex justify-center mb-4">
            <TonConnectButton />
          </div>
        )}

        {/* Кнопка Play Now */}
        <button
          className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-400 rounded-lg text-white font-bold hover:opacity-90"
          onClick={handlePlayNow}
          disabled={loading}
        >
          {loading ? "Connecting..." : "Play Now"}
        </button>

        {/* Кнопка Learn More */}
        <button
          className="w-full py-3 bg-gray-800 border border-gray-600 rounded-lg text-white font-bold hover:bg-gray-700"
          onClick={() => window.open("https://widepiper.com/", "_blank")}
        >
          Learn More
        </button>
      </div>
    </div>
  );
};

export default HomePage;

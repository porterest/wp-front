import React, { useEffect } from "react";
import {
  // useTonWallet,
  useTonConnectUI,
  useIsConnectionRestored,
} from "@tonconnect/ui-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const WalletHandler: React.FC = () => {
  const { loginWithProof } = useAuth();
  const [tonConnectUI] = useTonConnectUI();
  // const wallet = useTonWallet();
  const isConnectionRestored = useIsConnectionRestored();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isConnectionRestored) return;

    const unsubscribe = tonConnectUI.onStatusChange(async (wallet) => {
      if (!wallet) {
        console.log("Wallet disconnected or not available");
        return;
      }

      console.log("Wallet connected:", wallet);

      // Проверяем tonProof
      const tonProof = wallet.connectItems?.tonProof;
      if (tonProof && "proof" in tonProof) {
        const proof = tonProof.proof;
        try {
          await loginWithProof({
            address: wallet.account.address,
            network: wallet.account.chain.toString(),
            public_key: wallet.account.publicKey!,
            proof: {
              timestamp: proof.timestamp,
              domain: {
                LengthBytes: Number(proof.domain.lengthBytes),
                value: proof.domain.value,
              },
              payload: proof.payload,
              signature: proof.signature,
              state_init: wallet.account.walletStateInit,
            },
          });
          navigate("/game");
        } catch (error) {
          console.error("Login with proof failed:", error);
          alert("Authentication failed. Please try again.");
          tonConnectUI.disconnect();
        }
      } else {
        console.warn("No valid tonProof in wallet");
        // Можно предложить снова открыть модал или вывести ошибку
      }
    });

    return () => {
      unsubscribe();
    };
  }, [tonConnectUI, isConnectionRestored, loginWithProof, navigate]);

  return null;
};

export default WalletHandler;

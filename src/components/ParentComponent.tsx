import React from "react";
import GamePage from "../pages/GamePage"; // Убедитесь, что путь к GamePage правильный

const ParentComponent: React.FC = () => {
    return (
        <div>
            <h1 className="text-center text-white text-2xl p-4">3D Betting Visualization</h1>
            <GamePage />
        </div>
    );
};

export default ParentComponent;

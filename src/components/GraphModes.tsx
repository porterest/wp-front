import React from "react";
import BetArrow from "./BetArrow";
import CandlestickChart from "./CandlestickChart";
import GradientPlanes from "./GradientPlanes";
import Axes from "./Axes";
import * as THREE from "three";

interface GraphModesProps {
    currentMode: number;
    data: any[];
    previousBetEnd: THREE.Vector3;
    userPreviousBet: THREE.Vector3;
    setUserPreviousBet: (value: THREE.Vector3) => void;
    axisMode: "X" | "Y";
    onDragging: (isDragging: boolean) => void;
    onShowConfirmButton: (show: boolean) => void;
}

const GraphModes: React.FC<GraphModesProps> = ({
                                                   currentMode,
                                                   data,
                                                   previousBetEnd,
                                                   userPreviousBet,
                                                   setUserPreviousBet,
                                                   axisMode,
                                                   onDragging,
                                                   onShowConfirmButton,
                                               }) => {
    return (
        <>
            {/* Градиентные плоскости */}
            <GradientPlanes />

            {/* Оси */}
            <Axes />

            {/* Режимы отображения */}
            {currentMode === 1 && (
                // Режим "Axes" (только стрелки ставки)
                <BetArrow
                    previousBetEnd={previousBetEnd}
                    userPreviousBet={userPreviousBet}
                    setUserPreviousBet={setUserPreviousBet}
                    axisMode={axisMode}
                    onDragging={onDragging}
                    onShowConfirmButton={onShowConfirmButton}
                />
            )}

            {currentMode === 2 && (
                // Режим "Candles" (только свечи)
                <CandlestickChart
                    data={data}
                    graphDimensions={{ x: 10, y: 5, z: 5 }}
                    mode="Candles"
                />
            )}

            {currentMode === 3 && (
                <>
                    {/* Режим "Both" (свечи с прозрачностью и стрелки ставки) */}
                    <CandlestickChart
                        data={data}
                        graphDimensions={{ x: 10, y: 5, z: 5 }}
                        mode="Both"
                    />
                    <BetArrow
                        previousBetEnd={previousBetEnd}
                        userPreviousBet={userPreviousBet}
                        setUserPreviousBet={setUserPreviousBet}
                        axisMode={axisMode}
                        onDragging={onDragging}
                        onShowConfirmButton={onShowConfirmButton}
                    />
                </>
            )}
        </>
    );
};

export default GraphModes;

import React, { useMemo, useCallback } from "react";
import BetArrow from "./BetArrow"; // Компонент для управления стрелкой
import * as THREE from "three";
import CandlestickChart from "./CandlestickChart";
import GradientPlanes from "./GradientPlanes";
import Axes from "./Axes";
import LastBetVector from "./LastBetVector";
import { PairOption } from "../types/pair";
import { CandleData } from "../types/candles";
import { Html } from "@react-three/drei";

interface GraphModesProps {
  currentMode: number; // Текущий режим отображения графика
  data: CandleData[] | null; // Данные свечей
  selectedPair: PairOption | null;
  previousBetEnd: THREE.Vector3; // Конец предыдущей общей ставки
  userPreviousBet: THREE.Vector3; // Конец пунктира (прошлая ставка пользователя)
  setUserPreviousBet: (value: THREE.Vector3) => void; // Обновление конечной точки пользовательской ставки
  axisMode: "X" | "Y"; // Режим управления осями
  onDragging: (isDragging: boolean) => void; // Управление состоянием перетаскивания
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] },
  ) => void; // Управление видимостью кнопки и передача данных ставки
}

const GraphModes: React.FC<GraphModesProps> = ({
                                                 currentMode,
                                                 data,
                                                 selectedPair,
                                                 previousBetEnd,
                                                 userPreviousBet,
                                                 setUserPreviousBet,
                                                 axisMode,
                                                 onDragging,
                                                 onShowConfirmButton,
                                               }) => {
  // Мемоизация данных для предотвращения лишних рендеров
  const memoizedData = useMemo(() => data, [data]);

  // Обертка для предотвращения постоянного изменения ссылок
  const memoizedSetUserPreviousBet = useCallback(setUserPreviousBet, []);
  const memoizedOnDragging = useCallback(onDragging, []);
  const memoizedOnShowConfirmButton = useCallback(onShowConfirmButton, []);

  // Мемоизация рендера контента в зависимости от currentMode
  const renderContent = useMemo(() => {
    if (currentMode === 1) {
      return (
        <LastBetVector
          selectedPair={selectedPair}
          previousBetEnd={previousBetEnd}
        />
      );
    }
    if (currentMode === 2 && memoizedData) {
      return <CandlestickChart data={memoizedData} mode="Candles" />;
    }
    if (currentMode === 3 && memoizedData) {
      return (
        <>
          <CandlestickChart data={memoizedData} mode="Both" />
          <LastBetVector
            selectedPair={selectedPair}
            previousBetEnd={previousBetEnd}
          />
        </>
      );
    }
    return null;
  }, [currentMode, memoizedData, selectedPair, previousBetEnd]);

  // Проверка наличия данных
  if (!memoizedData || memoizedData.length === 0) {
    return (
      <Html>
        <div>No data available to render the graph.</div>
      </Html>
    );
  }

  // Рендер компонента
  return (
    <>
      <GradientPlanes />
      <Axes />
      <BetArrow
        previousBetEnd={previousBetEnd}
        userPreviousBet={userPreviousBet}
        setUserPreviousBet={memoizedSetUserPreviousBet}
        axisMode={axisMode}
        onDragging={memoizedOnDragging}
        onShowConfirmButton={memoizedOnShowConfirmButton}
      />
      {renderContent}
    </>
  );
};

export default GraphModes;


// import React from "react";
// import BetArrow from "./BetArrow"; // Компонент для управления стрелкой
// import * as THREE from "three";
// import CandlestickChart from "./CandlestickChart";
// import GradientPlanes from "./GradientPlanes";
// import Axes from "./Axes";
// import LastBetVector from "./LastBetVector";
// import { PairOption } from "../types/pair";
// import { CandleData } from "../types/candles";
// import { Html } from "@react-three/drei";
//
// interface GraphModesProps {
//   currentMode: number; // Текущий режим отображения графика
//   data: CandleData[] | null; // Данные свечей
//   selectedPair: PairOption | null;
//   previousBetEnd: THREE.Vector3; // Конец предыдущей общей ставки
//   userPreviousBet: THREE.Vector3; // Конец пунктира (прошлая ставка пользователя)
//   setUserPreviousBet: (value: THREE.Vector3) => void; // Обновление конечной точки пользовательской ставки
//   axisMode: "X" | "Y"; // Режим управления осями
//   onDragging: (isDragging: boolean) => void; // Управление состоянием перетаскивания
//   onShowConfirmButton: (
//     show: boolean,
//     betData?: { amount: number; predicted_vector: number[] },
//   ) => void; // Управление видимостью кнопки и передача данных ставки
// }
//
// const GraphModes: React.FC<GraphModesProps> = ({
//   currentMode,
//   data,
//   selectedPair,
//   previousBetEnd,
//   userPreviousBet,
//   setUserPreviousBet,
//   axisMode,
//   onDragging,
//   onShowConfirmButton,
// }) => {
//   // Проверка данных
//   if (!data || data.length === 0) {
//     return <Html>
//       <div>No data available to render the graph.</div>
//     </Html>;
//   }
//
//   // Рендеринг
//   return (
//     <>
//       {/* Градиентные плоскости и оси всегда отображаются */}
//       <GradientPlanes />
//       <Axes />
//       <BetArrow
//         previousBetEnd={previousBetEnd}
//         userPreviousBet={userPreviousBet}
//         setUserPreviousBet={setUserPreviousBet}
//         axisMode={axisMode}
//         onDragging={onDragging}
//         onShowConfirmButton={onShowConfirmButton}
//       />
//
//       {/*Выбор режима отображения */}
//       {currentMode === 1 && (
//         <LastBetVector
//           selectedPair={selectedPair}
//           previousBetEnd={previousBetEnd}
//         />
//       )}
//
//       {currentMode === 2 && data && (
//         <CandlestickChart
//           data={data}
//           mode="Candles"
//         />
//       )}
//
//       {currentMode === 3 && (
//         <>
//           {data && (
//             <CandlestickChart
//               data={data}
//               mode="Both"
//             />
//           )}
//           <LastBetVector
//             selectedPair={selectedPair}
//             previousBetEnd={previousBetEnd}
//           />
//         </>
//       )}
//     </>
//   );
// };
//
// export default GraphModes;

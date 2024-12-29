import React from "react";
import BetArrow from "./BetArrow"; // Компонент для управления стрелкой
import * as THREE from "three";
import CandlestickChart from "./CandlestickChart";
import GradientPlanes from "./GradientPlanes";
import Axes from "./Axes";
import { CandleData } from "./CandlestickChart";
import { Html } from "@react-three/drei";

interface GraphModesProps {
  currentMode: number; // Текущий режим отображения графика
  data: CandleData[] | null; // Данные свечей
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
                                                 previousBetEnd,
                                                 userPreviousBet,
                                                 setUserPreviousBet,
                                                 axisMode,
                                                 onDragging,
                                                 onShowConfirmButton,
                                               }) => {
  // Константы
  const graphDimensions = { x: 10, y: 5, z: 5 };

  // Проверка данных
  if (!data || data.length === 0) {
    return <Html>
      <div>No data available to render the graph.</div>
    </Html>;
  }

  // Рендеринг
  return (
    <>
      {/* Градиентные плоскости и оси всегда отображаются */}
      <GradientPlanes />
      <Axes />

       {/*Выбор режима отображения */}
      {currentMode === 1 && (
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
        <CandlestickChart
          data={data}
          graphDimensions={graphDimensions}
          mode="Candles"
        />
      )}

      {currentMode === 3 && (
        <>
          <CandlestickChart
            data={data}
            graphDimensions={graphDimensions}
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

// import React from "react";
// import BetArrow from "./BetArrow"; // Компонент для управления стрелкой
// import * as THREE from "three";
// import CandlestickChart from "./CandlestickChart";
// import GradientPlanes from "./GradientPlanes";
// import Axes from "./Axes";
// import { CandleData } from "./CandlestickChart";
//
// interface GraphModesProps {
//   currentMode: number; // Текущий режим отображения графика
//   data: CandleData[]; // Данные свечей
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
//   previousBetEnd,
//   userPreviousBet,
//   setUserPreviousBet,
//   axisMode,
//   onDragging,
//   onShowConfirmButton,
// }) => {
//   if (!data || data.length === 0) {
//     console.warn("No data available to render in GraphModes.");
//     return null;
//   }
//   return (
//     <>
//       {/* Градиентные плоскости */}
//       <GradientPlanes />
//
//       {/* Оси */}
//       <Axes />
//
//       {/* Режимы отображения */}
//       {currentMode === 1 && (
//         <BetArrow
//           previousBetEnd={previousBetEnd}
//           userPreviousBet={userPreviousBet}
//           setUserPreviousBet={setUserPreviousBet}
//           axisMode={axisMode}
//           onDragging={onDragging}
//           onShowConfirmButton={onShowConfirmButton}
//         />
//       )}
//
//       {currentMode === 2 && (
//         <CandlestickChart
//           data={data}
//           graphDimensions={{ x: 10, y: 5, z: 5 }}
//           mode="Candles"
//         />
//       )}
//
//       {currentMode === 3 && (
//         <>
//           <CandlestickChart
//             data={data}
//             graphDimensions={{ x: 10, y: 5, z: 5 }}
//             mode="Both"
//           />
//           <BetArrow
//             previousBetEnd={previousBetEnd}
//             userPreviousBet={userPreviousBet}
//             setUserPreviousBet={setUserPreviousBet}
//             axisMode={axisMode}
//             onDragging={onDragging}
//             onShowConfirmButton={onShowConfirmButton}
//           />
//         </>
//       )}
//     </>
//   );
// };
//
// export default GraphModes;
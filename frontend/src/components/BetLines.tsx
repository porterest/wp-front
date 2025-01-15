import React, { useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { DebouncedFunc } from "lodash";
import { fetchUserBalances } from "../services/api";

// interface UserInfo { user_id: string; balance: number; atRisk: number; }

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;   // конец жёлтой линии
  userPreviousBet: THREE.Vector3;  // конец белой линии (старая ставка) или совпадает с previousBetEnd, если не было
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  // При axisMode="X" двигаем X, при "Y" двигаем Y, а остальные координаты не трогаем.
  axisMode: "X" | "Y";
}

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             maxWhiteLength,
                                             handleDrag,
                                             axisMode,
                                           }) => {
  // Ссылки на объекты
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const yellowConeRef = useRef<THREE.Mesh>(null);
  const whiteConeRef = useRef<THREE.Mesh>(null);

  // Drag
  const [isDragging, setIsDragging] = useState(false);

  // Позиция конца белой линии (изначально userPreviousBet).
  // ВАЖНО: при смене axisMode НЕ сбрасываем, чтобы сохранять состояние.
  // Изначальная позиция конца белой линии
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    const initPos = userPreviousBet.clone();
    // Обрежем до maxWhiteLength, если нужно
    const betDir = initPos.clone().sub(previousBetEnd);
    if (betDir.length() > maxWhiteLength) {
      betDir.setLength(maxWhiteLength);
      initPos.copy(previousBetEnd).add(betDir);
    }
    return initPos;
  });
  // Баланс юзера
  const [userBalance, setUserBalance] = useState(0);

  // Подтянем баланс один раз
  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
      } catch (error) {
        console.error("Failed to fetch user balances:", error);
      }
    })();
  }, []);

  // THREE
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Debounced обновление белой линии
  const debouncedUpdateWhiteLine: DebouncedFunc<(pos: unknown)=>void> = debounce(
    (pos: unknown) => {
      if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
      const p = pos as THREE.Vector3;
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
        p.x, p.y, p.z,
      ]);
    },
    30
  );

  // Инициализация линий, конусов, сферы
  useEffect(() => {
    // === ЖЁЛТАЯ ЛИНИЯ: (0,0,0) → previousBetEnd (с обрезкой по maxYellowLength)
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    const yGeom = new LineGeometry();
    yGeom.setPositions([0,0,0, depositVec.x, depositVec.y, depositVec.z]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    yellowLineRef.current = new Line2(yGeom, yMat);
    scene.add(yellowLineRef.current);
    console.log("желтая линия")
    console.log(yellowLineRef.current)
    console.log([0,0,0, depositVec.x, depositVec.y, depositVec.z])

    // Желтый конус
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(depositVec);
      const dir = depositVec.clone().normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        yellowConeRef.current.setRotationFromQuaternion(quat);
      }
    }

    // === БЕЛАЯ ЛИНИЯ: previousBetEnd → betPosition
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      depositVec.x, depositVec.y, depositVec.z,
      betPosition.x,   betPosition.y,   betPosition.z
    ]);
    console.log("белая линия")
    console.log("userPreviousBet");
    console.log(depositVec.x, depositVec.y, depositVec.z,
      betPosition.x,   betPosition.y,   betPosition.z) // тут betPosition 0

    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    whiteLineRef.current = new Line2(wGeom, wMat);
    scene.add(whiteLineRef.current);

    // Белый конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(previousBetEnd).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // Сфера (drag point)
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
    };
  }, [scene, previousBetEnd, betPosition, maxYellowLength]);

  // Проверка клика по сфере
  const isClickOnSphere = (event: PointerEvent): boolean => {
    if (!sphereRef.current) return false;
    const mouse = new THREE.Vector2(
      (event.clientX / gl.domElement.clientWidth)*2 - 1,
      -(event.clientY / gl.domElement.clientHeight)*2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const hits = raycaster.current.intersectObject(sphereRef.current);
    return hits.length > 0;
  };

  // Обновляем плоскость (перпендикулярна взгляду, проходит через betPosition)
  const updatePlane = () => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  };

  // pointerDown
  const handlePointerDown = (e: PointerEvent) => {
    if (isClickOnSphere(e)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
    }
  };

  // pointerMove
  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging) return;

    const mouse = new THREE.Vector2(
      (e.clientX / gl.domElement.clientWidth)*2 - 1,
      -(e.clientY / gl.domElement.clientHeight)*2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersectPt = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
      return;
    }

    // direction = intersectPt - previousBetEnd
    const direction = intersectPt.clone().sub(previousBetEnd);

    // СОХРАНЯЕМ другие координаты, МЕНЯЕМ только нужную!
    const updatedPos = betPosition.clone(); // Текущее положение

    // Ограничим длину?
    // сначала примем direction, затем скорректируем одну ось
    // и в конце отрежем, если длиннее maxYellowLength
    const partialPos = previousBetEnd.clone().add(direction);

    // Перенесём partialPos в updatedPos, но только для одной координаты
    if (axisMode === "X") {
      updatedPos.x = partialPos.x; // менять X
      // y и z оставляем как было
    } else if (axisMode === "Y") {
      updatedPos.y = partialPos.y; // менять Y
      // x и z оставляем как было
    }

    // Ограничение для жёлтой линии (depositVec)
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }

// Ограничение для белой линии (betPosition)
    const finalDir = updatedPos.clone().sub(previousBetEnd);
    if (finalDir.length() > maxWhiteLength) {
      finalDir.setLength(maxWhiteLength);
      updatedPos.copy(previousBetEnd).add(finalDir);
    }


    setBetPosition(updatedPos);
    debouncedUpdateWhiteLine(updatedPos);

    // Сдвигаем сферу + конус
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedPos);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedPos);
      const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }

    // handleDrag
    handleDrag(updatedPos);
  };

  // pointerUp
  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Длина белой линии
      const finalDir = betPosition.clone().sub(previousBetEnd);
      const fraction = finalDir.length() / maxWhiteLength;
      // <--- делаем ставку пропорционально именно maxWhiteLength,
      //      т.к. теперь это максимум для белой линии
      const betAmount = fraction * userBalance;

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  };

  // Слушатели
  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl.domElement, handlePointerMove]);

  useFrame(() => {
    // пусто
  });

  return (
    <>
      {/* Желтый конус (конец агрегированной ставки) */}
      <mesh ref={yellowConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="yellow" />
      </mesh>

      {/* Белый конус (конец личной ставки) */}
      <mesh ref={whiteConeRef}>
        <coneGeometry args={[0.1, 0.3, 12]} />
        <meshStandardMaterial color="white" />
      </mesh>

      {/* Сфера (drag point) */}
      <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
        <sphereGeometry args={[1,16,16]} />
        <meshStandardMaterial color="blue" opacity={0.5} transparent />
        <mesh position={[0,0,0]}>
          <sphereGeometry args={[2,16,16]} />
          <meshStandardMaterial color="blue" opacity={0} transparent />
        </mesh>
      </mesh>
    </>
  );
};

export default BetLines;

//
// //тут стрелка отлично удлиняется и укорачивается, состояния между осями сохраняются короче все кайф, но стрелка прилеплена к плоскости


//
// import React, { useRef, useEffect, useState } from "react";
// import { useFrame, useThree } from "@react-three/fiber";
// import * as THREE from "three";
// import { Line2 } from "three/examples/jsm/lines/Line2";
// import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
// import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
// import debounce from "lodash.debounce";
// import { DebouncedFunc } from "lodash";
//
// interface BetLinesProps {
//   previousBetEnd: THREE.Vector3; // Конец желтой линии (Deposit)
//   userPreviousBet: THREE.Vector3; // Начальная позиция для белой стрелки
//   onDragging: (isDragging: boolean) => void;
//   onShowConfirmButton: (
//     show: boolean,
//     betData?: { amount: number; predicted_vector: number[] }
//   ) => void;
//   maxYellowLength: number;
//   handleDrag: (newPosition: THREE.Vector3) => void;
//   // Чтобы стрелка двигалась только по Y или только по Z
//   axisMode: "X" | "Y";
// }
//
// const BetLines: React.FC<BetLinesProps> = ({
//                                              previousBetEnd,
//                                              userPreviousBet,
//                                              onDragging,
//                                              onShowConfirmButton,
//                                              maxYellowLength,
//                                              handleDrag,
//                                              axisMode,
//                                            }) => {
//   const yellowLine = useRef<Line2 | null>(null);
//   const dashedLine = useRef<Line2 | null>(null);
//   const sphereRef = useRef<THREE.Mesh>(null);
//   const yellowConeRef = useRef<THREE.Mesh>(null);
//   const whiteConeRef = useRef<THREE.Mesh>(null);
//
//   const [isDragging, setIsDragging] = useState(false);
//
//   // Фиксированная ось X = 3.5, чтобы «время» не двигалось
//   const fixedTimeValue = 3.5;
//
//   // Начальная позиция белой стрелки
//   const [betPosition, setBetPosition] = useState<THREE.Vector3>(
//     userPreviousBet.clone()
//   );
//
//   // При маунте фиксируем x
//   useEffect(() => {
//     setBetPosition((prev) => {
//       const clone = prev.clone();
//       clone.x = fixedTimeValue;
//       return clone;
//     });
//   }, []);
//
//   const { gl, camera, scene } = useThree();
//   const raycaster = useRef(new THREE.Raycaster());
//
//   // Плоскость, параллельная YZ (нормаль = (1,0,0)),
//   // => x ВСЕГДА 3.5 при пересечении
//   const plane = useRef(
//     new THREE.Plane(new THREE.Vector3(1, 0, 0), -fixedTimeValue)
//   );
//
//   // Debounced-обновление белой линии
//   const debouncedUpdateLine: DebouncedFunc<(v: unknown) => void> = debounce(
//     (v: unknown) => {
//       const newEnd = v as THREE.Vector3;
//       if (dashedLine.current && dashedLine.current.geometry) {
//         (dashedLine.current.geometry as LineGeometry).setPositions([
//           previousBetEnd.x,
//           previousBetEnd.y,
//           previousBetEnd.z,
//           newEnd.x,
//           newEnd.y,
//           newEnd.z,
//         ]);
//       }
//     },
//     50
//   );
//
//   // Инициализация линий (желтая + белая)
//   useEffect(() => {
//     // === Желтая линия (Deposit) ===
//     const depositVector = previousBetEnd.clone();
//     if (depositVector.length() > maxYellowLength) {
//       depositVector.setLength(maxYellowLength);
//     }
//     const yellowLineGeometry = new LineGeometry();
//     yellowLineGeometry.setPositions([
//       0, 0, 0,
//       depositVector.x,
//       depositVector.y,
//       depositVector.z,
//     ]);
//     const yellowLineMaterial = new LineMaterial({
//       color: "yellow",
//       linewidth: 3,
//       resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
//     });
//     yellowLine.current = new Line2(yellowLineGeometry, yellowLineMaterial);
//     scene.add(yellowLine.current);
//
//     // Желтый конус
//     if (yellowConeRef.current) {
//       yellowConeRef.current.position.copy(depositVector);
//       const dir = depositVector.clone().normalize();
//       const up = new THREE.Vector3(0, 1, 0);
//       const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
//       yellowConeRef.current.setRotationFromQuaternion(quat);
//     }
//
//     // === Белая линия (User Bet) ===
//     const dashedLineGeometry = new LineGeometry();
//     dashedLineGeometry.setPositions([
//       previousBetEnd.x,
//       previousBetEnd.y,
//       previousBetEnd.z,
//       betPosition.x,
//       betPosition.y,
//       betPosition.z,
//     ]);
//     const dashedLineMaterial = new LineMaterial({
//       color: "white",
//       linewidth: 3,
//       resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
//     });
//     dashedLine.current = new Line2(dashedLineGeometry, dashedLineMaterial);
//     scene.add(dashedLine.current);
//
//     // Белый конус и сфера (drag point)
//     if (whiteConeRef.current) {
//       whiteConeRef.current.position.copy(betPosition);
//       const dirW = betPosition.clone().sub(previousBetEnd).normalize();
//       const up = new THREE.Vector3(0, 1, 0);
//       const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
//       whiteConeRef.current.setRotationFromQuaternion(quatW);
//     }
//     if (sphereRef.current) {
//       sphereRef.current.position.copy(betPosition);
//     }
//
//     return () => {
//       if (yellowLine.current) scene.remove(yellowLine.current);
//       if (dashedLine.current) scene.remove(dashedLine.current);
//     };
//   }, [scene, previousBetEnd, maxYellowLength, betPosition]);
//
//   // Проверка клика по сфере
//   const isIntersectingEndpoint = (event: PointerEvent): boolean => {
//     if (!sphereRef.current) return false;
//
//     const mouse = new THREE.Vector2(
//       (event.clientX / gl.domElement.clientWidth) * 2 - 1,
//       -(event.clientY / gl.domElement.clientHeight) * 2 + 1
//     );
//     raycaster.current.setFromCamera(mouse, camera);
//
//     return raycaster.current.intersectObject(sphereRef.current).length > 0;
//   };
//
//   // PointerDown
//   const handlePointerDown = (event: PointerEvent) => {
//     if (isIntersectingEndpoint(event)) {
//       setIsDragging(true);
//       onDragging(true);
//     }
//   };
//
//   // PointerMove
//   const handlePointerMove = (event: PointerEvent): void => {
//     if (!isDragging) return;
//
//     const mouse = new THREE.Vector2(
//       (event.clientX / gl.domElement.clientWidth) * 2 - 1,
//       -(event.clientY / gl.domElement.clientHeight) * 2 + 1
//     );
//     raycaster.current.setFromCamera(mouse, camera);
//
//     const intersection = new THREE.Vector3();
//     if (!raycaster.current.ray.intersectPlane(plane.current, intersection)) {
//       return;
//     }
//
//     // intersection.x ДОЛЖНО быть ~3.5 (т.к. плоскость x=3.5)
//     // Чтобы не болталось, фиксируем x точно
//     intersection.x = fixedTimeValue;
//
//     // Ограничим длину вектора от previousBetEnd
//     const directionWhite = intersection.clone().sub(previousBetEnd);
//     if (directionWhite.length() > maxYellowLength) {
//       directionWhite.setLength(maxYellowLength);
//     }
//
//     // Получили новую конечную точку
//     const newEndWhite = previousBetEnd.clone().add(directionWhite);
//
//     // Текущее положение (до перетаскивания)
//     const updatedPos = betPosition.clone();
//
//     // Ставим x фиксировано, т.к. "время" посередине
//     updatedPos.x = fixedTimeValue;
//
//     // Если у нас axisMode="Y", двигаемся только по Y, оставляем Z, чтобы не было «диагоналей»
//     if (axisMode === "Y") {
//       updatedPos.y = newEndWhite.y;
//       // Z оставляем прежним
//     }
//     // Если axisMode="Z", двигаемся только по Z
//     else if (axisMode === "X") {
//       updatedPos.z = newEndWhite.z;
//       // Y оставляем прежним
//     }
//
//     // Обновим состояние
//     setBetPosition(updatedPos);
//     debouncedUpdateLine(updatedPos);
//
//     // Сфера
//     if (sphereRef.current) {
//       sphereRef.current.position.copy(updatedPos);
//     }
//
//     // Поворот белого конуса
//     if (whiteConeRef.current) {
//       whiteConeRef.current.position.copy(updatedPos);
//       const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
//       const up = new THREE.Vector3(0, 1, 0);
//       const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
//       whiteConeRef.current.setRotationFromQuaternion(quatW);
//     }
//
//     // Вызываем колбэк
//     handleDrag(updatedPos);
//   };
//
//   // PointerUp
//   const handlePointerUp = () => {
//     if (isDragging) {
//       setIsDragging(false);
//       onDragging(false);
//
//       // Показать кнопку подтверждения
//       onShowConfirmButton(true, {
//         amount: 0, // Здесь можно проставить нужное значение
//         predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
//       });
//     }
//   };
//
//   // Регистрируем обработчики событий мыши
//   useEffect(() => {
//     const canvas = gl.domElement;
//     canvas.addEventListener("pointermove", handlePointerMove);
//     canvas.addEventListener("pointerdown", handlePointerDown);
//     canvas.addEventListener("pointerup", handlePointerUp);
//
//     return () => {
//       canvas.removeEventListener("pointermove", handlePointerMove);
//       canvas.removeEventListener("pointerdown", handlePointerDown);
//       canvas.removeEventListener("pointerup", handlePointerUp);
//     };
//   }, [gl.domElement, handlePointerMove]);
//
//   useFrame(() => {
//     // Пусто
//   });
//
//   return (
//     <>
//       {/* Желтый конус (Deposit) */}
//       <mesh ref={yellowConeRef}>
//         <coneGeometry args={[0.1, 0.3, 12]} />
//         <meshStandardMaterial color="yellow" />
//       </mesh>
//
//       {/* Белый конус (Bet) */}
//       <mesh ref={whiteConeRef}>
//         <coneGeometry args={[0.1, 0.3, 12]} />
//         <meshStandardMaterial color="white" />
//       </mesh>
//
//       {/* Сфера (drag point) */}
//       <mesh ref={sphereRef} scale={[0.5, 0.5, 0.5]}>
//         <sphereGeometry args={[1.0, 16, 16]} />
//         <meshStandardMaterial color="blue" opacity={0.5} transparent />
//         <mesh position={[0, 0, 0]}>
//           <sphereGeometry args={[2.0, 16, 16]} />
//           <meshStandardMaterial color="blue" opacity={0} transparent />
//         </mesh>
//       </mesh>
//     </>
//   );
// };
//
// export default BetLines;

// тут все слегка по пизде но зато стрелка не прилипает к плоскости (фото тг)


// import React, { useRef, useEffect, useState } from "react";
// import { useFrame, useThree } from "@react-three/fiber";
// import * as THREE from "three";
// import { Line2 } from "three/examples/jsm/lines/Line2";
// import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
// import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
// import debounce from "lodash.debounce";
// import { DebouncedFunc } from "lodash";
// import { fetchUserBalances } from "../services/api";
//
// // interface UserInfo { user_id: string; balance: number; atRisk: number; }
//
// interface BetLinesProps {
//   previousBetEnd: THREE.Vector3;   // конец жёлтой линии
//   userPreviousBet: THREE.Vector3;  // конец белой линии (старая ставка) или совпадает с previousBetEnd, если не было
//   onDragging: (isDragging: boolean) => void;
//   onShowConfirmButton: (
//     show: boolean,
//     betData?: { amount: number; predicted_vector: number[] }
//   ) => void;
//   maxYellowLength: number;
//   handleDrag: (newPosition: THREE.Vector3) => void;
//   // При axisMode="X" двигаем X, при "Y" двигаем Y, а остальные координаты не трогаем.
//   axisMode: "X" | "Y";
// }
//
// const BetLines: React.FC<BetLinesProps> = ({
//                                              previousBetEnd,
//                                              userPreviousBet,
//                                              onDragging,
//                                              onShowConfirmButton,
//                                              maxYellowLength,
//                                              handleDrag,
//                                              axisMode,
//                                            }) => {
//   // Ссылки на объекты
//   const yellowLineRef = useRef<Line2 | null>(null);
//   const whiteLineRef = useRef<Line2 | null>(null);
//   const sphereRef = useRef<THREE.Mesh>(null);
//   const yellowConeRef = useRef<THREE.Mesh>(null);
//   const whiteConeRef = useRef<THREE.Mesh>(null);
//
//   // Drag
//   const [isDragging, setIsDragging] = useState(false);
//
//   const fixedTimeValue = 3.5;
//
//   // Позиция конца белой линии (изначально userPreviousBet).
//   // ВАЖНО: при смене axisMode НЕ сбрасываем, чтобы сохранять состояние.
//   const [betPosition, setBetPosition] = useState<THREE.Vector3>(() =>
//     userPreviousBet.clone()
//   );
//
//   // При маунте фиксируем x
//   useEffect(() => {
//     setBetPosition((prev) => {
//       const clone = prev.clone();
//       clone.x = fixedTimeValue;
//       return clone;
//     });
//   }, []);
//
//   // Баланс юзера
//   const [userBalance, setUserBalance] = useState(0);
//
//   // Подтянем баланс один раз
//   useEffect(() => {
//     (async () => {
//       try {
//         const { balance } = await fetchUserBalances();
//         setUserBalance(balance);
//       } catch (error) {
//         console.error("Failed to fetch user balances:", error);
//       }
//     })();
//   }, []);
//
//   // THREE
//   const { gl, camera, scene } = useThree();
//   const raycaster = useRef(new THREE.Raycaster());
//
// // Плоскость, параллельная YZ (нормаль = (1,0,0)),
// // => x ВСЕГДА 3.5 при пересечении
//   const plane = useRef(
//     new THREE.Plane(new THREE.Vector3(1, 0, 0), -fixedTimeValue)
//   );
//
//   // Debounced обновление белой линии
//   const debouncedUpdateWhiteLine: DebouncedFunc<(pos: unknown)=>void> = debounce(
//     (pos: unknown) => {
//       if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
//       const p = pos as THREE.Vector3;
//       const geom = whiteLineRef.current.geometry as LineGeometry;
//       geom.setPositions([
//         previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
//         p.x, p.y, p.z,
//       ]);
//     },
//     30
//   );
//
//   // Инициализация линий, конусов, сферы
//   useEffect(() => {
//     // === ЖЁЛТАЯ ЛИНИЯ: (0,0,0) → previousBetEnd (с обрезкой по maxYellowLength)
//     const depositVec = previousBetEnd.clone();
//     if (depositVec.length() > maxYellowLength) {
//       depositVec.setLength(maxYellowLength);
//     }
//     const yGeom = new LineGeometry();
//     yGeom.setPositions([0,0,0, depositVec.x, depositVec.y, depositVec.z]);
//     const yMat = new LineMaterial({
//       color: "yellow",
//       linewidth: 3,
//       resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
//     });
//     yellowLineRef.current = new Line2(yGeom, yMat);
//     scene.add(yellowLineRef.current);
//
//     // Желтый конус
//     if (yellowConeRef.current) {
//       yellowConeRef.current.position.copy(depositVec);
//       const dir = depositVec.clone().normalize();
//       if (dir.length() > 0) {
//         const up = new THREE.Vector3(0,1,0);
//         const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
//         yellowConeRef.current.setRotationFromQuaternion(quat);
//       }
//     }
//
//     // === БЕЛАЯ ЛИНИЯ: previousBetEnd → betPosition
//     const wGeom = new LineGeometry();
//     wGeom.setPositions([
//       previousBetEnd.x, previousBetEnd.y, previousBetEnd.z,
//       betPosition.x,   betPosition.y,   betPosition.z
//     ]);
//     const wMat = new LineMaterial({
//       color: "white",
//       linewidth: 3,
//       resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
//     });
//     whiteLineRef.current = new Line2(wGeom, wMat);
//     scene.add(whiteLineRef.current);
//
//     // Белый конус
//     if (whiteConeRef.current) {
//       whiteConeRef.current.position.copy(betPosition);
//       const dirW = betPosition.clone().sub(previousBetEnd).normalize();
//       if (dirW.length() > 0) {
//         const up = new THREE.Vector3(0,1,0);
//         const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
//         whiteConeRef.current.setRotationFromQuaternion(quatW);
//       }
//     }
//
//     // Сфера (drag point)
//     if (sphereRef.current) {
//       sphereRef.current.position.copy(betPosition);
//     }
//
//     return () => {
//       if (yellowLineRef.current) scene.remove(yellowLineRef.current);
//       if (whiteLineRef.current) scene.remove(whiteLineRef.current);
//     };
//   }, [scene, previousBetEnd, betPosition, maxYellowLength]);
//
//   // Проверка клика по сфере
//   const isClickOnSphere = (event: PointerEvent): boolean => {
//     if (!sphereRef.current) return false;
//     const mouse = new THREE.Vector2(
//       (event.clientX / gl.domElement.clientWidth)*2 - 1,
//       -(event.clientY / gl.domElement.clientHeight)*2 + 1
//     );
//     raycaster.current.setFromCamera(mouse, camera);
//     const hits = raycaster.current.intersectObject(sphereRef.current);
//     return hits.length > 0;
//   };
//
//   // Обновляем плоскость (перпендикулярна взгляду, проходит через betPosition)
//   const updatePlane = () => {
//     const camDir = camera.getWorldDirection(new THREE.Vector3());
//     plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
//   };
//
//   // pointerDown
//   const handlePointerDown = (e: PointerEvent) => {
//     if (isClickOnSphere(e)) {
//       setIsDragging(true);
//       onDragging(true);
//       updatePlane();
//     }
//   };
//
//   // pointerMove
//   const handlePointerMove = (e: PointerEvent) => {
//     if (!isDragging) return;
//
//     const mouse = new THREE.Vector2(
//       (e.clientX / gl.domElement.clientWidth)*2 - 1,
//       -(e.clientY / gl.domElement.clientHeight)*2 + 1
//     );
//     raycaster.current.setFromCamera(mouse, camera);
//
//     const intersectPt = new THREE.Vector3();
//     if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
//       return;
//     }
//
//     // direction = intersectPt - previousBetEnd
//     const direction = intersectPt.clone().sub(previousBetEnd);
//
//     // СОХРАНЯЕМ другие координаты, МЕНЯЕМ только нужную!
//     const updatedPos = betPosition.clone(); // Текущее положение
//
//     // Ограничим длину?
//     // сначала примем direction, затем скорректируем одну ось
//     // и в конце отрежем, если длиннее maxYellowLength
//     const partialPos = previousBetEnd.clone().add(direction);
//
//     updatedPos.x = fixedTimeValue;
//
//     // Перенесём partialPos в updatedPos, но только для одной координаты
//     if (axisMode === "X") {
//       updatedPos.x = partialPos.x; // менять X
//       // y и z оставляем как было
//     } else if (axisMode === "Y") {
//       updatedPos.y = partialPos.y; // менять Y
//       // x и z оставляем как было
//     }
//
//     // Теперь ограничим итоговую длину
//     const finalDir = updatedPos.clone().sub(previousBetEnd);
//     if (finalDir.length() > maxYellowLength) {
//       finalDir.setLength(maxYellowLength);
//       updatedPos.copy(previousBetEnd).add(finalDir);
//     }
//
//     setBetPosition(updatedPos);
//     debouncedUpdateWhiteLine(updatedPos);
//
//     // Сдвигаем сферу + конус
//     if (sphereRef.current) {
//       sphereRef.current.position.copy(updatedPos);
//     }
//     if (whiteConeRef.current) {
//       whiteConeRef.current.position.copy(updatedPos);
//       const dirW = updatedPos.clone().sub(previousBetEnd).normalize();
//       if (dirW.length() > 0) {
//         const up = new THREE.Vector3(0,1,0);
//         const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
//         whiteConeRef.current.setRotationFromQuaternion(quatW);
//       }
//     }
//
//     // handleDrag
//     handleDrag(updatedPos);
//   };
//
//   // pointerUp
//   const handlePointerUp = () => {
//     if (isDragging) {
//       setIsDragging(false);
//       onDragging(false);
//
//       // Длина белой линии
//       const finalDir = betPosition.clone().sub(previousBetEnd);
//       const fraction = finalDir.length() / maxYellowLength;
//       const betAmount = fraction * userBalance;
//
//       onShowConfirmButton(true, {
//         amount: betAmount,
//         predicted_vector: [
//           betPosition.x, betPosition.y, betPosition.z
//         ],
//       });
//     }
//   };
//
//   // Слушатели
//   useEffect(() => {
//     const canvas = gl.domElement;
//     canvas.addEventListener("pointerdown", handlePointerDown);
//     canvas.addEventListener("pointermove", handlePointerMove);
//     canvas.addEventListener("pointerup", handlePointerUp);
//
//     return () => {
//       canvas.removeEventListener("pointerdown", handlePointerDown);
//       canvas.removeEventListener("pointermove", handlePointerMove);
//       canvas.removeEventListener("pointerup", handlePointerUp);
//     };
//   }, [gl.domElement, handlePointerMove]);
//
//   useFrame(() => {
//     // пусто
//   });
//
//   return (
//     <>
//       {/* Желтый конус (конец агрегированной ставки) */}
//       <mesh ref={yellowConeRef}>
//         <coneGeometry args={[0.1, 0.3, 12]} />
//         <meshStandardMaterial color="yellow" />
//       </mesh>
//
//       {/* Белый конус (конец личной ставки) */}
//       <mesh ref={whiteConeRef}>
//         <coneGeometry args={[0.1, 0.3, 12]} />
//         <meshStandardMaterial color="white" />
//       </mesh>
//
//       {/* Сфера (drag point) */}
//       <mesh ref={sphereRef} scale={[0.5,0.5,0.5]}>
//         <sphereGeometry args={[1,16,16]} />
//         <meshStandardMaterial color="blue" opacity={0.5} transparent />
//         <mesh position={[0,0,0]}>
//           <sphereGeometry args={[2,16,16]} />
//           <meshStandardMaterial color="blue" opacity={0} transparent />
//         </mesh>
//       </mesh>
//     </>
//   );
// };
//
// export default BetLines;

//это я попыталась совместить эти два варианта но получилось говно тупое

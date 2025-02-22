import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { useUserBalance } from "../pages/BalancePage";

// Интерфейс пропсов компонента WhileLine
// aggregator – вектор, полученный как "желтый агрегатор" (например, предыдущая ставка)
// betPosition – текущая позиция ставки, которую устанавливает пользователь
// userPreviousBet – предыдущая ставка пользователя (используется для расчёта направления)
// visible – флаг видимости компонента
// sphereRef – ссылка на сферу, используемую для hit-тестинга (определения наведения курсора)
interface WhileLineProps {
  aggregator: THREE.Vector3;
  betPosition: THREE.Vector3 | null;
  userPreviousBet: THREE.Vector3;
  visible: boolean;
  sphereRef: React.MutableRefObject<THREE.Mesh | null>;
}

// Масштабный коэффициент для преобразования координат
const scaleFactor = 1;
// Порог разницы по оси цены (Y), ниже которого считаем, что ставка совпадает с агрегатором (риск = 0)
const PRICE_DIFF_THRESHOLD = 0.001;

// Функция проверки, является ли вектор нулевым (с учётом эпсилон)
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

const WhileLine: React.FC<WhileLineProps> = ({
                                               aggregator,
                                               betPosition,
                                               userPreviousBet,
                                               visible,
                                               sphereRef,
                                             }) => {
  // Ссылка на группу объектов Three.js
  const groupRef = useRef<THREE.Group>(null);
  // Ссылки на линию и конус (наконечник стрелки)
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  // Локальные состояния для управления hover (для tooltip, если понадобится) и для отображения ставки
  const [hovered, setHovered] = useState(false);
  const [displayBet, setDisplayBet] = useState(0);
  // Локальное состояние для уровня риска (текст и цвет)
  const [riskText, setRiskText] = useState("");
  const [riskColor, setRiskColor] = useState("white");

  // Получаем депозит пользователя
  const { userData } = useUserBalance();
  const deposit = userData?.balance || 0;

  useEffect(() =>{
  }, [hovered]);

  // Мемоизированный вектор агрегатора, масштабированный с фиксированным z = 1
  const scaledAggregator = useMemo(() => {
    if (isVectorZero(aggregator)) return null; // или возвращать исходный агрегатор, или другой дефолт
    const scaled = aggregator.clone().multiplyScalar(scaleFactor);
    scaled.x = 1;
    return scaled;
  }, [aggregator]);


  // Мемоизированная позиция ставки, масштабированная с фиксированным z = 2
  const scaledBet = useMemo(() => {
    if (!betPosition) return null;
    const scaled = betPosition.clone().multiplyScalar(scaleFactor);
    scaled.x = 2;
    return scaled;
  }, [betPosition]);

  // Первоначальная отрисовка линии, конуса и сферы
  useEffect(() => {
    if (!visible || !groupRef.current) return;
    if (!scaledAggregator || isVectorZero(aggregator)) return;


    if (!betPosition || !scaledBet) {
      groupRef.current.children.forEach((child) => groupRef.current?.remove(child));
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      return;
    }

    // Создание линии между агрегатором и ставкой
    const wGeom = new LineGeometry();
    if (aggregator) {
      wGeom.setPositions([
        scaledAggregator.x,
        scaledAggregator.y,
        scaledAggregator.z,
        scaledBet.x,
        scaledBet.y,
        scaledBet.z,
      ]);
    }
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // Создание наконечника стрелки (конуса)
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    wCone.position.copy(scaledBet);
    wCone.position.x = 2;
    const defaultDir = new THREE.Vector3(0, 1, 0);
    let desiredDir: THREE.Vector3;
    if (isVectorZero(userPreviousBet)) {
      desiredDir = new THREE.Vector3(2, betPosition.y, betPosition.z).normalize();
    } else {
      desiredDir = betPosition.clone().sub(aggregator).normalize();
    }
    if (desiredDir.length() > 0) {
      const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
      wCone.setRotationFromQuaternion(quat);
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Создание сферы для hit-тестинга
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      })
    );
    sph.position.copy(scaledBet);
    groupRef.current.add(sph);
    sphereRef.current = sph;

    const pointerProps = sph as unknown as {
      onPointerOver?: () => void;
      onPointerOut?: () => void;
    };
    pointerProps.onPointerOver = () => setHovered(true);
    pointerProps.onPointerOut = () => setHovered(false);

    return () => {
      groupRef.current?.remove(wLine);
      groupRef.current?.remove(wCone);
      groupRef.current?.remove(sph);
      pointerProps.onPointerOver = undefined;
      pointerProps.onPointerOut = undefined;
    };
  }, [aggregator, betPosition, scaledBet, userPreviousBet, visible, sphereRef, scaledAggregator]);

  // Обновление позиций объектов при изменениях
  useEffect(() => {
    if (!visible || !betPosition) return;
    const updatedAgg = aggregator.clone().multiplyScalar(scaleFactor);
    updatedAgg.x = 1;
    const updatedBet = betPosition.clone().multiplyScalar(scaleFactor);
    updatedBet.x = 2;
    if (whiteLineRef.current && whiteLineRef.current.geometry instanceof LineGeometry) {
      whiteLineRef.current.geometry.setPositions([
        updatedAgg.x,
        updatedAgg.y,
        updatedAgg.z,
        updatedBet.x,
        updatedBet.y,
        updatedBet.z,
      ]);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedBet);
      whiteConeRef.current.position.x = updatedBet.x;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = updatedBet.clone().sub(updatedAgg).normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedBet);
      sphereRef.current.position.x = updatedBet.x;
    }
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry &&
      whiteLineRef.current.geometry.attributes.position
    ) {
      whiteLineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [aggregator, betPosition, visible, sphereRef]);

  // useFrame: обновление цвета стрелки, анимации наконечника и расчёт ставки/риск-уровня
  useFrame((state) => {
    if (!betPosition || !scaledBet || !scaledAggregator || isVectorZero(aggregator)) return;
    console.log("scaledAggregator, scaledBet");
    console.log(scaledAggregator, scaledBet);
    const priceDiff = Math.abs(scaledAggregator.y - scaledBet.y);
    const currentPrice = scaledAggregator.y;
    const riskFraction = priceDiff < PRICE_DIFF_THRESHOLD ? 0 : priceDiff / currentPrice;
    const newBetAmount = deposit * riskFraction;
    setDisplayBet(newBetAmount);

    // Определяем уровень риска и соответствующий цвет:
    // riskFraction < 0.05 -> "Low risk" (green)
    // riskFraction < 0.15 -> "Medium risk" (yellow)
    // riskFraction < 0.30 -> "High risk" (orange)
    // иначе -> "Critical risk" (red)
    let newRiskText = "";
    let newColorStr = "white";
    if (riskFraction === 0) {
      newRiskText = "";
      newColorStr = "white";
    } else if (riskFraction < 0.05) {
      newRiskText = "Low risk";
      newColorStr = "green";
    } else if (riskFraction < 0.15) {
      newRiskText = "Medium risk";
      newColorStr = "yellow";
    } else if (riskFraction < 0.30) {
      newRiskText = "High risk";
      newColorStr = "orange";
    } else {
      newRiskText = "Critical risk";
      newColorStr = "red";
    }
    setRiskText(newRiskText);
    setRiskColor(newColorStr);

    if (whiteLineRef.current) {
      (whiteLineRef.current.material as LineMaterial).color.set(newColorStr);
    }
    if (whiteConeRef.current) {
      (whiteConeRef.current.material as THREE.MeshStandardMaterial).color.set(newColorStr);
      if (riskFraction >= 0.30) {
        const pulse = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 10);
        whiteConeRef.current.scale.set(pulse, pulse, pulse);
      } else {
        whiteConeRef.current.scale.set(1, 1, 1);
      }
    }
  });

  const formatNumber = (num: number) =>
    num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <group ref={groupRef}>
      {/* Всегда отображаем tooltip с уровнем риска (можно стилизовать отдельно, если нужно) */}
      {scaledBet && (
        <>
          <Html position={[scaledBet.x, scaledBet.y - 0.5, scaledBet.z + 0.5]} distanceFactor={10}>
            <div
              style={{
                background: "rgba(0,0,0,0.7)",
                padding: "4px 8px",
                width: "110px",
                textAlign: "center",
                borderRadius: "4px",
                fontSize: "12px",
                color: riskColor,
              }}
            >
              {`Bet: ${formatNumber(displayBet)} DD ${riskText}`}
            </div>
          </Html>
        </>
      )}
    </group>
  );
};

export default WhileLine;

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";

interface WhileLineProps {
  aggregator: THREE.Vector3;         // Желтый агрегатор (например, aggregatorClipped из BetLines)
  betPosition: THREE.Vector3 | null; // Позиция ставки, как установил пользователь
  userPreviousBet: THREE.Vector3;    // Предыдущая ставка (для расчёта направления)
  visible: boolean;
  sphereRef: React.MutableRefObject<THREE.Mesh | null>;
}

const scaleFactor = 0.4;

const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

const WhileLine: React.FC<WhileLineProps> = ({
                                               aggregator,
                                               betPosition,
                                               userPreviousBet,
                                               visible,
                                               sphereRef,
                                             }) => {
  const groupRef = useRef<THREE.Group>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const [hovered, setHovered] = useState(false);
  const [riskText, setRiskText] = useState("");

  // Масштабированный агрегатор: z фиксирован на 1
  const scaledAggregator = useMemo(() => {
    const scaled = aggregator.clone().multiplyScalar(scaleFactor);
    scaled.z = 1;
    return scaled;
  }, [aggregator]);

  // Масштабированная ставка: z фиксирован на 2
  const scaledBet = useMemo(() => {
    if (!betPosition) return null;
    const scaled = betPosition.clone().multiplyScalar(scaleFactor);
    scaled.z = 2;
    return scaled;
  }, [betPosition]);

  // Первичная отрисовка стрелки: линия, конус и сфера для hit-тестинга/tooltip
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;

    if (!betPosition || !scaledBet) {
      if (groupRef.current && whiteLineRef.current) {
        groupRef.current.remove(whiteLineRef.current);
      }
      if (groupRef.current && whiteConeRef.current) {
        groupRef.current.remove(whiteConeRef.current);
      }
      if (groupRef.current && sphereRef.current) {
        groupRef.current.remove(sphereRef.current);
      }
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      return;
    }

    // Линия между агрегатором и ставкой
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      scaledAggregator.x,
      scaledAggregator.y,
      scaledAggregator.z,
      scaledBet.x,
      scaledBet.y,
      scaledBet.z,
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine);

    // Наконечник (конус)
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" })
    );
    wCone.position.copy(scaledBet);
    wCone.position.z = 2;
    const defaultDir = new THREE.Vector3(0, 1, 0);
    let desiredDir: THREE.Vector3;
    if (isVectorZero(userPreviousBet)) {
      desiredDir = new THREE.Vector3(betPosition.x, betPosition.y, 2).normalize();
    } else {
      desiredDir = betPosition.clone().sub(aggregator).normalize();
    }
    if (desiredDir.length() > 0) {
      const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
      wCone.setRotationFromQuaternion(quat);
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Сфера для hit-тестинга и tooltip
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

    // Присваиваем события через свойства onPointerOver и onPointerOut
    // (это поддерживается react‑three‑fiber для JSX-элементов, а здесь мы приводим объект через unknown)
    const pointerProps = sph as unknown as {
      onPointerOver?: () => void;
      onPointerOut?: () => void;
    };
    pointerProps.onPointerOver = () => setHovered(true);
    pointerProps.onPointerOut = () => setHovered(false);

    return () => {
      if (groupRef.current && whiteLineRef.current) {
        groupRef.current.remove(whiteLineRef.current);
      }
      if (groupRef.current && whiteConeRef.current) {
        groupRef.current.remove(whiteConeRef.current);
      }
      if (groupRef.current && sphereRef.current) {
        groupRef.current.remove(sphereRef.current);
      }
      // Обнуляем свойства
      pointerProps.onPointerOver = undefined;
      pointerProps.onPointerOut = undefined;
    };
  }, [aggregator, betPosition, scaledBet, userPreviousBet, visible, sphereRef]);

  // Обновление позиций объектов при изменениях
  useEffect(() => {
    if (!visible) return;
    const updatedAgg = aggregator.clone().multiplyScalar(scaleFactor);
    updatedAgg.z = 1;
    if (!betPosition) return;
    const updatedBet = betPosition.clone().multiplyScalar(scaleFactor);
    updatedBet.z = 2;
    if (whiteLineRef.current && whiteLineRef.current.geometry instanceof LineGeometry) {
      const positions = [
        updatedAgg.x,
        updatedAgg.y,
        updatedAgg.z,
        updatedBet.x,
        updatedBet.y,
        updatedBet.z,
      ];
      whiteLineRef.current.geometry.setPositions(positions);
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(updatedBet);
      whiteConeRef.current.position.z = updatedBet.z;
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const desiredDir = updatedBet.clone().sub(updatedAgg).normalize();
      if (desiredDir.length() > 0) {
        const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedBet);
      sphereRef.current.position.z = updatedBet.z;
    }
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry &&
      whiteLineRef.current.geometry.attributes.position
    ) {
      whiteLineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [aggregator, betPosition, visible, sphereRef]);

  // useFrame: динамическое обновление цвета, анимации наконечника и tooltip'а
  useFrame((state) => {
    if (!betPosition || !scaledBet) return;
    const currentPrice = scaledAggregator.x; // Цена агрегатора
    const betPrice = scaledBet.x;            // Цена ставки
    const riskFraction = Math.abs(currentPrice - betPrice) / currentPrice;
    let newColorStr = "white";
    let newRiskText = "";
    if (riskFraction === 0) {
      newColorStr = "white";
      newRiskText = "";
    } else if (riskFraction < 0.05) {
      newColorStr = "green";
      newRiskText = "Низкий риск";
    } else if (riskFraction < 0.15) {
      newColorStr = "orange";
      newRiskText = "Средний риск";
    } else {
      newColorStr = "red";
      newRiskText = riskFraction < 0.30 ? "Высокий риск – опасно" : "Критический риск";
    }
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
    if (hovered && newRiskText !== riskText) {
      setRiskText(newRiskText);
    }
  });

  return (
    <group ref={groupRef}>
      {hovered && scaledBet && (
        <Html position={[scaledBet.x, scaledBet.y, scaledBet.z + 0.5]} distanceFactor={10}>
          <div
            style={{
              background: "rgba(255,255,255,0.8)",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              color: "#000",
            }}
          >
            {riskText}
          </div>
        </Html>
      )}
    </group>
  );
};

export default WhileLine;

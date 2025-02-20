import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";

interface WhileLineProps {
  aggregator: THREE.Vector3; // исходный агрегатор (например, aggregatorClipped из BetLines)
  betPosition: THREE.Vector3 | null; // исходная позиция ставки
  userPreviousBet: THREE.Vector3; // предыдущая ставка пользователя
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

  // Вычисляем масштабированные версии агрегатора и ставки
  const scaledAggregator = useMemo(() => {
    const scaled = aggregator.clone().multiplyScalar(scaleFactor);
    scaled.z = 1;
    return scaled;
  }, [aggregator]);

  const scaledBet = useMemo(() => {
    if (!betPosition) return null;
    const scaled = betPosition.clone().multiplyScalar(scaleFactor);
    scaled.z = 2;
    return scaled;
  }, [betPosition]);

  // Отрисовка белой стрелки (ставки)
  useEffect(() => {
    if (!visible) return;
    if (!groupRef.current) return;

    if (!betPosition || !scaledBet) {
      // Если нет позиции ставки, удаляем объекты, если они есть
      if (groupRef.current && whiteLineRef.current) {
        groupRef.current.remove(whiteLineRef.current);
      }
      if (groupRef.current && whiteConeRef.current) {
        groupRef.current.remove(whiteConeRef.current);
      }
      // Также очищаем переданный ref сферы
      if (groupRef.current && sphereRef.current) {
        groupRef.current.remove(sphereRef.current);
      }
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      return;
    }

    // Создаём линию между агрегатором и позицией ставки
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

    // Создаём конус, обозначающий наконечник стрелки
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

    // Создаём сферу для наглядности (например, с эффектом прозрачности)
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
    // Передаём ссылку на созданную сферу через переданный ref
    sphereRef.current = sph;

    return () => {
      if (groupRef.current && whiteLineRef.current)
        groupRef.current.remove(whiteLineRef.current);
      if (groupRef.current && whiteConeRef.current)
        groupRef.current.remove(whiteConeRef.current);
      if (groupRef.current && sphereRef.current)
        groupRef.current.remove(sphereRef.current);
    };
  }, [aggregator, betPosition, scaledBet, userPreviousBet, visible, sphereRef]);

  // Обновление геометрии и позиций объектов при изменениях
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
  }, [aggregator, betPosition, visible]);

  if (!visible) return null;
  return <group ref={groupRef} />;
};

export default WhileLine;

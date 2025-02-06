import React, { useEffect, useRef, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3;    // Конец жёлтой стрелки (от сервера)
  userPreviousBet: THREE.Vector3;   // Конец белой стрелки (от сервера)
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y"; // Если задан, то при drag движение только по указанной оси
  setBetAmount: (newAmount: number) => void;
}

const LOCAL_KEY = "userBetVector";

const BetLines: React.FC<BetLinesProps> = ({
                                             previousBetEnd,
                                             userPreviousBet,
                                             onDragging,
                                             onShowConfirmButton,
                                             maxYellowLength,
                                             maxWhiteLength,
                                             handleDrag,
                                             axisMode,
                                             setBetAmount,
                                           }) => {
  const { gl, camera, scene } = useThree();

  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // Состояние баланса юзера
  const [userBalance, setUserBalance] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { balance } = await fetchUserBalances();
        setUserBalance(balance);
        console.log("User balance loaded:", balance);
      } catch (error) {
        console.error("Failed to fetch user balances:", error);
      }
    })();
  }, []);

  // ----------- A) ЖЁЛТАЯ СТРЕЛКА (aggregator) -----------

  // Храним «конечный» вектор жёлтой стрелки в ref, чтобы не пересоздавать объекты
  const aggregatorRef = useRef(new THREE.Vector3());
  // При инициализации или когда previousBetEnd меняется — обрезаем по maxYellowLength
  useEffect(() => {
    const agg = previousBetEnd.clone();
    if (agg.length() > maxYellowLength) {
      agg.setLength(maxYellowLength);
    }
    aggregatorRef.current.copy(agg);
    console.log("Aggregator updated:", aggregatorRef.current.toArray());
    // Далее обновим геометрию жёлтой стрелки (line/cone), если они уже созданы
    updateYellowObjects();
  }, [previousBetEnd, maxYellowLength]);

  // ----------- B) БЕЛАЯ СТРЕЛКА (betPosition) -----------

  // При монтировании читаем localStorage. Если нет — используем userPreviousBet.
  const getStoredUserBet = (): THREE.Vector3 | null => {
    try {
      const str = localStorage.getItem(LOCAL_KEY);
      if (str) {
        const arr = JSON.parse(str);
        return new THREE.Vector3(arr[0], arr[1], arr[2]);
      }
    } catch (err) {
      console.error("Error parsing stored user bet:", err);
    }
    return null;
  };

  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    // Инициируем из localStorage или из userPreviousBet
    const stored = getStoredUserBet();
    const bp = stored ? stored.clone() : userPreviousBet.clone();
    return bp;
  });

  // Если userPreviousBet меняется, а localStorage пуст, тоже обновимся
  useEffect(() => {
    const stored = getStoredUserBet();
    if (!stored) {
      setBetPosition(userPreviousBet.clone());
    }
  }, [userPreviousBet]);

  // ----------- C) ОБЪЕКТЫ THREE.JS (создаём один раз) -----------

  const yellowLineRef = useRef<Line2|null>(null);
  const yellowConeRef = useRef<THREE.Mesh|null>(null);

  const whiteLineRef = useRef<Line2|null>(null);
  const whiteConeRef = useRef<THREE.Mesh|null>(null);
  const sphereRef = useRef<THREE.Mesh|null>(null);

  // useEffect без зависимостей — создаём объекты один раз
  useEffect(() => {
    console.log("Creating all 3D objects (yellow/white lines, cones, sphere) one time.");

    // ---------- YELLOW LINE & CONE ----------
    {
      const yGeom = new LineGeometry();
      yGeom.setPositions([
        0,0,0,
        aggregatorRef.current.x,
        aggregatorRef.current.y,
        aggregatorRef.current.z,
      ]);
      const yMat = new LineMaterial({
        color: "yellow",
        linewidth: 3,
        resolution: new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
      });
      const yLine = new Line2(yGeom, yMat);
      scene.add(yLine);
      yellowLineRef.current = yLine;

      const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
      const coneMat = new THREE.MeshStandardMaterial({ color: "yellow" });
      const yCone = new THREE.Mesh(coneGeom, coneMat);
      scene.add(yCone);
      yellowConeRef.current = yCone;
    }

    // ---------- WHITE LINE & CONE & SPHERE ----------
    {
      const wGeom = new LineGeometry();
      wGeom.setPositions([
        aggregatorRef.current.x, aggregatorRef.current.y, aggregatorRef.current.z,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      const wMat = new LineMaterial({
        color: "white",
        linewidth: 3,
        resolution: new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
      });
      const wLine = new Line2(wGeom, wMat);
      scene.add(wLine);
      whiteLineRef.current = wLine;

      const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
      const coneMat = new THREE.MeshStandardMaterial({ color: "white" });
      const wCone = new THREE.Mesh(coneGeom, coneMat);
      scene.add(wCone);
      whiteConeRef.current = wCone;

      const sphereGeom = new THREE.SphereGeometry(0.5, 16, 16);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: "blue",
        opacity: 0.5,
        transparent: true,
      });
      const sp = new THREE.Mesh(sphereGeom, sphereMat);
      scene.add(sp);
      sphereRef.current = sp;
    }

    // При размонтировании удалим объекты
    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, []);

  // Функция для обновления существующих объектов жёлтой стрелки, если aggregatorRef меняется
  const updateYellowObjects = useCallback(() => {
    if (yellowLineRef.current?.geometry) {
      const geom = yellowLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0,0,0,
        aggregatorRef.current.x,
        aggregatorRef.current.y,
        aggregatorRef.current.z,
      ]);
      if (geom.computeBoundingSphere) {
        geom.computeBoundingSphere();
      }
    }
    if (yellowConeRef.current) {
      yellowConeRef.current.position.copy(aggregatorRef.current);
      // Поворот
      const up = new THREE.Vector3(0,1,0);
      const dir = aggregatorRef.current.clone().normalize();
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yellowConeRef.current.setRotationFromQuaternion(quat);
    }
  }, []);

  // useEffect — если aggregator меняется, обновляем жёлтые объекты
  useEffect(() => {
    updateYellowObjects();
  }, [updateYellowObjects]);

  // useEffect — при изменении betPosition (или aggregator) обновляем белую линию, белый конус, сферу
  useEffect(() => {
    // offset + ограничение
    const offset = betPosition.clone().sub(aggregatorRef.current);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      setBetPosition(aggregatorRef.current.clone().add(offset));
      return; // чтобы не делать двойное обновление за раз
    }

    // 1) Линия
    if (whiteLineRef.current?.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorRef.current.x, aggregatorRef.current.y, aggregatorRef.current.z,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      if (geom.computeBoundingSphere) {
        geom.computeBoundingSphere();
      }
    }
    // 2) Конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dir = betPosition.clone().sub(aggregatorRef.current).normalize();
      if (dir.length() > 0) {
        const up = new THREE.Vector3(0,1,0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        whiteConeRef.current.setRotationFromQuaternion(quat);
      }
    }
    // 3) Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [betPosition, maxWhiteLength]);

  // --- DRAG & DROP ---
  const [isDragging, setIsDragging] = useState(false);

  // Проверяем клик по сфере
  const isClickOnSphere = useCallback((e: PointerEvent) => {
    if (!sphereRef.current) return false;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);
    const intersects = raycaster.current.intersectObject(sphereRef.current);
    return intersects.length > 0;
  }, [camera, gl.domElement]);

  const updatePlane = useCallback(() => {
    // Обновляем plane по направлению камеры, проходящую через текущее betPosition
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  }, [camera, betPosition]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (isClickOnSphere(e)) {
      setIsDragging(true);
      onDragging(true);
      updatePlane();
      console.log("PointerDown: start dragging");
    }
  }, [isClickOnSphere, onDragging, updatePlane]);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    const rect = gl.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.current.setFromCamera(mouse, camera);

    const intersectPoint = new THREE.Vector3();
    if (!raycaster.current.ray.intersectPlane(plane.current, intersectPoint)) {
      console.log("PointerMove: no intersection with plane");
      return;
    }

    let updatedPos = intersectPoint.clone();

    // axisMode
    if (axisMode === "X") {
      updatedPos.y = betPosition.y;
      updatedPos.z = betPosition.z;
    } else if (axisMode === "Y") {
      updatedPos.x = betPosition.x;
      updatedPos.z = betPosition.z;
    }

    // offset
    const offset = updatedPos.clone().sub(aggregatorRef.current);
    if (offset.length() > maxWhiteLength) {
      offset.setLength(maxWhiteLength);
      updatedPos = aggregatorRef.current.clone().add(offset);
    }

    setBetPosition(updatedPos);

    // Обновим сумму ставки
    const fraction = offset.length() / maxWhiteLength;
    setBetAmount(userBalance * fraction);

    // Вызываем handleDrag
    handleDrag(updatedPos);
  }, [
    isDragging,
    gl.domElement,
    camera,
    axisMode,
    betPosition,
    maxWhiteLength,
    userBalance,
    handleDrag
  ]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragging(false);

    const offset = betPosition.clone().sub(aggregatorRef.current);
    const fraction = Math.min(offset.length() / maxWhiteLength, 1);
    const betAmt = fraction * userBalance;
    setBetAmount(betAmt);

    console.log("PointerUp, final bet:", betPosition.toArray(), "betAmt:", betAmt);

    // Сообщаем наверх, чтобы показать кнопку Confirm
    onShowConfirmButton(true, {
      amount: betAmt,
      predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
    });
  }, [
    isDragging,
    betPosition,
    aggregatorRef,
    maxWhiteLength,
    userBalance,
    setBetAmount,
    onDragging,
    onShowConfirmButton,
  ]);

  // навешиваем/снимаем обработчики
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
  }, [handlePointerDown, handlePointerMove, handlePointerUp, gl.domElement]);

  return null;
};

export default BetLines;

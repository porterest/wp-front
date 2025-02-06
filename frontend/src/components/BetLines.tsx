import React, { useEffect, useRef, useState, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { fetchUserBalances } from "../services/api";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // От сервера: конец жёлтой стрелки (агрегированная ставка)
  userPreviousBet: THREE.Vector3;  // От сервера: конец белой стрелки (прошлая ставка юзера)
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: { amount: number; predicted_vector: number[] }
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y"; // Если задан, то при drag обновляются только соответствующие координаты
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

  console.log("COMPONENT RENDER", {
    previousBetEnd: previousBetEnd.toArray(),
    userPreviousBet: userPreviousBet.toArray(),
    maxWhiteLength,
  });

  // --- Загружаем баланс пользователя
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

  // --- Вычисляем агрегированный вектор для жёлтой стрелки
  // Если длина previousBetEnd превышает maxYellowLength, обрезаем.
  const [aggregator, setAggregator] = useState<THREE.Vector3>(() => {
    const v = previousBetEnd.clone();
    if (v.length() > maxYellowLength) v.setLength(maxYellowLength);
    return v;
  });
  useEffect(() => {
    const newAgg = previousBetEnd.clone();
    if (newAgg.length() > maxYellowLength) newAgg.setLength(maxYellowLength);
    console.log("Updating aggregator from previousBetEnd:", previousBetEnd.toArray(), "->", newAgg.toArray());
    setAggregator(newAgg);
  }, [previousBetEnd, maxYellowLength]);

  // --- Получаем сохранённый вектор ставки из localStorage (если есть)
  const getStoredUserBet = (): THREE.Vector3 | null => {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr) && arr.length >= 3) {
          return new THREE.Vector3(arr[0], arr[1], arr[2]);
        }
      } catch (err) {
        console.error("Error parsing stored user bet:", err);
      }
    }
    return null;
  };

  // --- Инициализируем позицию белой стрелки (betPosition)
  // Если в localStorage есть сохранённый вектор, используем его, иначе server value.
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    const stored = getStoredUserBet();
    const bp = stored ? stored : userPreviousBet.clone();
    if (bp.length() > maxWhiteLength) bp.setLength(maxWhiteLength);
    console.log("Initial betPosition:", bp.toArray());
    return bp;
  });
  useEffect(() => {
    const stored = getStoredUserBet();
    const bp = stored ? stored : userPreviousBet.clone();
    if (bp.length() > maxWhiteLength) bp.setLength(maxWhiteLength);
    console.log("Updated betPosition:", bp.toArray());
    setBetPosition(bp);
  }, [userPreviousBet, maxWhiteLength]);

  // --- Функция для сохранения вектора ставки в localStorage
  const storeUserBet = useCallback((v: THREE.Vector3) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(v.toArray()));
    console.log("Stored user bet vector:", v.toArray());
  }, []);

  // --- Функция обновления геометрии белой линии
  const updateWhiteLine = (pos: THREE.Vector3) => {
    if (whiteLineRef.current && whiteLineRef.current.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      // Теперь белая стрелка рисуется от (0,0,0) до pos
      console.log("Updating white line geometry: from origin to pos:", pos.toArray());
      geom.setPositions([
        0, 0, 0,
        pos.x, pos.y, pos.z,
      ]);
      if (geom.computeBoundingSphere) {
        geom.computeBoundingSphere();
      }
    }
  };
  // @ts-expect-error meow
  const debouncedUpdateWhiteLine = debounce((pos: THREE.Vector3) => {
      updateWhiteLine(pos);
    },
    15
  ) as (...args: [THREE.Vector3]) => void;

  // --- Ссылки на объекты для стрелок и сферы
  const yellowLineRef = useRef<Line2 | null>(null);
  const whiteLineRef = useRef<Line2 | null>(null);
  const yellowConeRef = useRef<THREE.Mesh | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  const sphereRef = useRef<THREE.Mesh | null>(null);

  // --- Отрисовка жёлтой стрелки (линия + конус)
  useEffect(() => {
    console.log("Creating yellow line and cone");
    // Жёлтая стрелка рисуется от (0,0,0) до агрегатора
    const yGeom = new LineGeometry();
    yGeom.setPositions([
      0, 0, 0,
      aggregator.x, aggregator.y, aggregator.z,
    ]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    scene.add(yLine);
    console.log("Yellow line added:", yLine);

    // Жёлтый конус в конце стрелки
    const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: "yellow" });
    const yCone = new THREE.Mesh(coneGeom, coneMat);
    yCone.position.copy(aggregator);
    console.log("Yellow cone initial position:", aggregator.toArray());
    // Для жёлтого конуса базовый вектор (1,0,0) – т.е. 0° направлен вправо.
    const base = new THREE.Vector3(1, 0, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(base, aggregator.clone().normalize());
    yCone.setRotationFromQuaternion(quat);
    console.log("Yellow cone rotation set with quaternion:", quat);
    yellowConeRef.current = yCone;
    scene.add(yCone);
    console.log("Yellow cone added:", yCone);

    return () => {
      if (yellowLineRef.current) {
        scene.remove(yellowLineRef.current);
        console.log("Yellow line removed");
      }
      if (yellowConeRef.current) {
        scene.remove(yellowConeRef.current);
        console.log("Yellow cone removed");
      }
    };
  }, [scene, aggregator, gl.domElement.clientWidth, gl.domElement.clientHeight]);

  // --- Отрисовка белой стрелки (линия + конус + draggable сфера)
  useEffect(() => {
    console.log("Creating white line, cone and draggable sphere");
    // Белая стрелка теперь рисуется от (0,0,0) до betPosition (без смещения относительно агрегатора)
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      0, 0, 0,
      betPosition.x, betPosition.y, betPosition.z,
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(gl.domElement.clientWidth, gl.domElement.clientHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    scene.add(wLine);
    console.log("White line added:", wLine);

    // Белый конус в конце стрелки
    const coneGeom = new THREE.ConeGeometry(0.1, 0.3, 12);
    const coneMat = new THREE.MeshStandardMaterial({ color: "white" });
    const wCone = new THREE.Mesh(coneGeom, coneMat);
    wCone.position.copy(betPosition);
    // Для белого конуса тоже используем базовый вектор (1,0,0)
    const base = new THREE.Vector3(1, 0, 0);
    const dirW = betPosition.clone().normalize();
    const quatW = new THREE.Quaternion().setFromUnitVectors(base, dirW);
    wCone.setRotationFromQuaternion(quatW);
    console.log("White cone rotation set with quaternion:", quatW);
    whiteConeRef.current = wCone;
    scene.add(wCone);
    console.log("White cone added:", wCone);

    // Draggable сфера для перетаскивания
    const sphereGeom = new THREE.SphereGeometry(0.5, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: "blue",
      opacity: 0.5,
      transparent: true,
    });
    const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
    sphereMesh.position.copy(betPosition);
    sphereRef.current = sphereMesh;
    scene.add(sphereMesh);
    console.log("Draggable sphere added:", sphereMesh);

    return () => {
      if (whiteLineRef.current) {
        scene.remove(whiteLineRef.current);
        console.log("White line removed");
      }
      if (whiteConeRef.current) {
        scene.remove(whiteConeRef.current);
        console.log("White cone removed");
      }
      if (sphereRef.current) {
        scene.remove(sphereRef.current);
        console.log("Sphere removed");
      }
    };
  }, [scene, betPosition, gl.domElement.clientWidth, gl.domElement.clientHeight]);

  // --- Обновление белой стрелки при изменении betPosition
  useEffect(() => {
    console.log("Updating white line due to betPosition change:", betPosition.toArray());
    if (whiteLineRef.current && whiteLineRef.current.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        0, 0, 0,
        betPosition.x, betPosition.y, betPosition.z,
      ]);
      if (geom.computeBoundingSphere) {
        geom.computeBoundingSphere();
      }
    }
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const base = new THREE.Vector3(1, 0, 0);
      const dirW = betPosition.clone().normalize();
      const quatW = new THREE.Quaternion().setFromUnitVectors(base, dirW);
      whiteConeRef.current.setRotationFromQuaternion(quatW);
    }
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [betPosition]);

  // --- Drag & Drop логика (редактирование ставки)
  const [isDragging, setIsDragging] = useState(false);
  const isClickOnSphere = useCallback(
    (event: PointerEvent): boolean => {
      if (!sphereRef.current) return false;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const intersects = raycaster.current.intersectObject(sphereRef.current);
      console.log("isClickOnSphere:", intersects);
      return intersects.length > 0;
    },
    [gl.domElement, camera]
  );

  const updatePlane = useCallback(() => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
    console.log("Plane updated:", plane.current);
  }, [camera, betPosition]);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (isClickOnSphere(e)) {
        setIsDragging(true);
        onDragging(true);
        updatePlane();
        console.log("PointerDown: activated dragging");
      }
    },
    [isClickOnSphere, onDragging, updatePlane]
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.current.setFromCamera(mouse, camera);
      const intersectPoint = new THREE.Vector3();
      if (!raycaster.current.ray.intersectPlane(plane.current, intersectPoint)) {
        console.log("PointerMove: No intersection with plane");
        return;
      }
      console.log("PointerMove: intersectPoint =", intersectPoint.toArray());

      // Если axisMode задан, ограничиваем изменение только по указанной оси
      const updatedPos = intersectPoint.clone();
      if (axisMode === "X") {
        updatedPos.y = betPosition.y;
        updatedPos.z = betPosition.z;
      } else if (axisMode === "Y") {
        updatedPos.x = betPosition.x;
        updatedPos.z = betPosition.z;
      }

      // Ограничиваем длину белой стрелки: если updatedPos длиннее maxWhiteLength, обрезаем
      if (updatedPos.length() > maxWhiteLength) {
        updatedPos.setLength(maxWhiteLength);
        console.log("PointerMove: betPosition clamped to maxWhiteLength");
      }

      console.log("PointerMove: updated betPosition =", updatedPos.toArray());
      setBetPosition(updatedPos);
      debouncedUpdateWhiteLine(updatedPos);

      const fraction = updatedPos.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);
      console.log("PointerMove: fraction =", fraction, "=> betAmount =", userBalance * fraction);
      handleDrag(updatedPos);
      storeUserBet(updatedPos);
    },
    [
      isDragging,
      gl.domElement,
      camera,
      axisMode,
      betPosition,
      maxWhiteLength,
      userBalance,
      debouncedUpdateWhiteLine,
      setBetAmount,
      handleDrag,
      aggregator, // не используем aggregator здесь для расчёта, т.к. белый вектор абсолютный
      storeUserBet,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);
      const fraction = Math.min(betPosition.length() / maxWhiteLength, 1);
      const betAmt = fraction * userBalance;
      setBetAmount(betAmt);
      console.log("PointerUp: betPosition =", betPosition.toArray(), "fraction =", fraction, "betAmt =", betAmt);
      onShowConfirmButton(true, {
        amount: betAmt,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
      storeUserBet(betPosition);
    }
  }, [isDragging, betPosition, maxWhiteLength, userBalance, setBetAmount, onDragging, onShowConfirmButton, storeUserBet]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    console.log("Added pointer event listeners");
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      console.log("Removed pointer event listeners");
    };
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  return null;
};

export default BetLines;

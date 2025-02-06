import React, {
  useEffect,
  useRef,
  useState,
  MutableRefObject,
  useCallback,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import debounce from "lodash.debounce";
import { fetchUserBalances } from "../services/api";
import { DebouncedFunc } from "lodash";

interface BetLinesProps {
  previousBetEnd: THREE.Vector3; // конец жёлтой линии
  userPreviousBet: THREE.Vector3; // конец белой линии (старая ставка)
  onDragging: (isDragging: boolean) => void;
  onShowConfirmButton: (
    show: boolean,
    betData?: {
      amount: number;
      predicted_vector: number[];
    },
  ) => void;
  maxYellowLength: number;
  maxWhiteLength: number;
  handleDrag: (newPosition: THREE.Vector3) => void;
  axisMode: "X" | "Y";
  setBetAmount: (newAmount: number) => void;
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
                                             setBetAmount,
                                           }) => {
  // -------------- РЕФЫ (исправлены на MutableRefObject) --------------
  const yellowLineRef = useRef<Line2 | null>(null) as MutableRefObject<Line2 | null>;
  const whiteLineRef = useRef<Line2 | null>(null) as MutableRefObject<Line2 | null>;
  const sphereRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;
  const yellowConeRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;
  const whiteConeRef = useRef<THREE.Mesh | null>(null) as MutableRefObject<THREE.Mesh | null>;

  // Drag
  const [isDragging, setIsDragging] = useState(false);

  // Баланс юзера
  const [userBalance, setUserBalance] = useState(0);

  // Один раз подгружаем баланс
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

  // ------------------ aggregatorClipped (жёлтая линия) -------------------
  const aggregatorClipped = React.useMemo(() => {
    const depositVec = previousBetEnd.clone();
    if (depositVec.length() > maxYellowLength) {
      depositVec.setLength(maxYellowLength);
    }
    return depositVec;
  }, [previousBetEnd, maxYellowLength]);

  console.log("aggregatorClipped - Это начало белой линии, конец жёлтой линии");
  console.log(aggregatorClipped);

  // ------------------ Начальное положение белой линии -------------------
  // (обрезаем её, если длина > maxWhiteLength)
  const [betPosition, setBetPosition] = useState<THREE.Vector3>(() => {
    const initPos = userPreviousBet.clone();
    const betDir = initPos.clone().sub(aggregatorClipped);
    if (betDir.length() > maxWhiteLength) {
      betDir.setLength(maxWhiteLength);
      initPos.copy(aggregatorClipped).add(betDir);
    }
    return initPos;
  });

  // Если userPreviousBet меняется извне, обновим betPosition
  useEffect(() => {
    const initPos = userPreviousBet.clone();
    const betDir = initPos.clone().sub(aggregatorClipped);
    if (betDir.length() > maxWhiteLength) {
      betDir.setLength(maxWhiteLength);
      initPos.copy(aggregatorClipped).add(betDir);
    }
    setBetPosition(initPos);
    console.log("2 установили позицию белой линии можно рисовать", initPos);
  }, [userPreviousBet, aggregatorClipped, maxWhiteLength]);

  // ------------ Инициализация Three.js ------------
  const { gl, camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane());

  // ------------ Debounced обновление белой линии ------------
  function updateWhiteLine(pos: THREE.Vector3) {
    if (!whiteLineRef.current || !whiteLineRef.current.geometry) return;
    const geom = whiteLineRef.current.geometry as LineGeometry;
    geom.setPositions([
      aggregatorClipped.x,
      aggregatorClipped.y,
      aggregatorClipped.z,
      pos.x,
      pos.y,
      pos.z,
    ]);
    // Можно вызвать computeLineDistances(), если нужно
    geom.computeBoundingSphere?.();
  }

  // @ts-expect-error unknown types in lib
  const debouncedUpdateWhiteLine: DebouncedFunc<(pos: THREE.Vector3) => void> = debounce(updateWhiteLine, 15);

  // ------------ Создание жёлтой линии и её конуса ------------
  useEffect(() => {
    // Линия жёлтая: (0,0,0) -> aggregatorClipped
    const yGeom = new LineGeometry();
    yGeom.setPositions([0, 0, 0, aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z]);
    const yMat = new LineMaterial({
      color: "yellow",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const yLine = new Line2(yGeom, yMat);
    yellowLineRef.current = yLine;
    scene.add(yLine);

    // Конус на конце жёлтой линии
    const yc = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "yellow" }),
    );
    yc.position.copy(aggregatorClipped);
    const dir = aggregatorClipped.clone().normalize();
    if (dir.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
      yc.setRotationFromQuaternion(quat);
    }
    yellowConeRef.current = yc;
    scene.add(yc);

    return () => {
      if (yellowLineRef.current) scene.remove(yellowLineRef.current);
      if (yellowConeRef.current) scene.remove(yellowConeRef.current);
    };
  }, [aggregatorClipped, scene]);

  // ------------ Создание белой линии (и обновление при mount/unmount) ------------
  useEffect(() => {
    // Линия белая: aggregatorClipped -> betPosition
    const wGeom = new LineGeometry();
    wGeom.setPositions([
      aggregatorClipped.x, aggregatorClipped.y, aggregatorClipped.z,
      betPosition.x,       betPosition.y,       betPosition.z,
    ]);
    const wMat = new LineMaterial({
      color: "white",
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    scene.add(wLine);

    // Белый конус
    const wc = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" }),
    );
    wc.position.copy(betPosition);
    const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
    if (dirW.length() > 0) {
      const up = new THREE.Vector3(0, 1, 0);
      const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
      wc.setRotationFromQuaternion(quatW);
    }
    whiteConeRef.current = wc;
    scene.add(wc);

    // Сфера (drag point)
    const sp = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 16, 16),
      new THREE.MeshStandardMaterial({ color: "blue", opacity: 0.5, transparent: true }),
    );
    sp.position.copy(betPosition);
    sphereRef.current = sp;
    scene.add(sp);

    return () => {
      if (whiteLineRef.current) scene.remove(whiteLineRef.current);
      if (whiteConeRef.current) scene.remove(whiteConeRef.current);
      if (sphereRef.current) scene.remove(sphereRef.current);
    };
  }, [aggregatorClipped, betPosition, scene]);

  // ------------ При изменении betPosition обновляем геометрию белой линии, конус, сферу ------------
  useEffect(() => {
    // Линия
    if (whiteLineRef.current && whiteLineRef.current.geometry) {
      const geom = whiteLineRef.current.geometry as LineGeometry;
      geom.setPositions([
        aggregatorClipped.x,
        aggregatorClipped.y,
        aggregatorClipped.z,
        betPosition.x,
        betPosition.y,
        betPosition.z,
      ]);
      geom.computeBoundingSphere?.();
    }
    // Конус
    if (whiteConeRef.current) {
      whiteConeRef.current.position.copy(betPosition);
      const dirW = betPosition.clone().sub(aggregatorClipped).normalize();
      if (dirW.length() > 0) {
        const up = new THREE.Vector3(0, 1, 0);
        const quatW = new THREE.Quaternion().setFromUnitVectors(up, dirW);
        whiteConeRef.current.setRotationFromQuaternion(quatW);
      }
    }
    // Сфера
    if (sphereRef.current) {
      sphereRef.current.position.copy(betPosition);
    }
  }, [aggregatorClipped, betPosition]);

  // ------------ Функции для Drag & Drop ------------
  const isClickOnSphere = useCallback(
    (event: PointerEvent): boolean => {
      if (!sphereRef.current) return false;
      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera);
      const hits = raycaster.current.intersectObject(sphereRef.current);
      return hits.length > 0;
    },
    [camera, gl.domElement],
  );

  const updatePlane = useCallback(() => {
    const camDir = camera.getWorldDirection(new THREE.Vector3());
    plane.current.setFromNormalAndCoplanarPoint(camDir, betPosition);
  }, [camera, betPosition]);

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (isClickOnSphere(e)) {
        setIsDragging(true);
        onDragging(true);
        updatePlane();
      }
    },
    [isClickOnSphere, updatePlane, onDragging],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!isDragging) return;

      const rect = gl.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.current.setFromCamera(mouse, camera);

      const intersectPt = new THREE.Vector3();
      if (!raycaster.current.ray.intersectPlane(plane.current, intersectPt)) {
        return;
      }

      const direction = intersectPt.clone().sub(aggregatorClipped);
      const updatedPos = betPosition.clone();

      const partialPos = aggregatorClipped.clone().add(direction);

      if (axisMode === "X") {
        updatedPos.x = partialPos.x;
      } else if (axisMode === "Y") {
        updatedPos.y = partialPos.y;
      }

      // Ограничиваем длину белой линии
      const finalDir = updatedPos.clone().sub(aggregatorClipped);
      if (finalDir.length() > maxWhiteLength) {
        finalDir.setLength(maxWhiteLength);
        updatedPos.copy(aggregatorClipped).add(finalDir);
      }

      setBetPosition(updatedPos);
      debouncedUpdateWhiteLine(updatedPos);

      // Обновляем сумму ставки в зависимости от длины
      const fraction = finalDir.length() / maxWhiteLength;
      setBetAmount(userBalance * fraction);

      // Коллбэк наружу
      handleDrag(updatedPos);
    },
    [
      isDragging,
      aggregatorClipped,
      betPosition,
      axisMode,
      maxWhiteLength,
      gl.domElement,
      camera,
      plane,
      userBalance,
      debouncedUpdateWhiteLine,
      setBetAmount,
      handleDrag,
    ],
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onDragging(false);

      // Финальный расчёт
      const finalDir = betPosition.clone().sub(aggregatorClipped);
      const fraction = Math.min(finalDir.length() / maxWhiteLength, 1);
      const betAmount = fraction * userBalance;

      onShowConfirmButton(true, {
        amount: betAmount,
        predicted_vector: [betPosition.x, betPosition.y, betPosition.z],
      });
    }
  }, [
    isDragging,
    onDragging,
    betPosition,
    aggregatorClipped,
    maxWhiteLength,
    userBalance,
    onShowConfirmButton,
  ]);

  // ------------ Ловим события мыши на canvas ------------
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
  }, [gl.domElement, handlePointerDown, handlePointerMove, handlePointerUp]);

  // useFrame, если нужно
  useFrame(() => {
    // Пусто
  });

  // Ничего не рендерим напрямую — всё создаём вручную в сцене
  return null;
};

export default BetLines;

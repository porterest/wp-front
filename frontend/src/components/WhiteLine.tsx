import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";

// Интерфейс пропсов компонента WhileLine
// aggregator – вектор, полученный как "желтый агрегатор" (напр. предыдущая ставка)
// betPosition – текущая позиция ставки, которую устанавливает пользователь
// userPreviousBet – предыдущая ставка пользователя (используется для расчёта направления)
// visible – флаг видимости компонента
// sphereRef – ссылка на сферу, которая используется для hit-тестинга (определения наведения курсора)
interface WhileLineProps {
  aggregator: THREE.Vector3;
  betPosition: THREE.Vector3 | null;
  userPreviousBet: THREE.Vector3;
  visible: boolean;
  sphereRef: React.MutableRefObject<THREE.Mesh | null>;
}

// Масштабный коэффициент для преобразования координат (чтобы привести их к нужной визуальной области)
const scaleFactor = 2;
// Порог разницы по оси цены (x), ниже которого считаем, что ставка совпадает с агрегатором (риск = 0)
const PRICE_DIFF_THRESHOLD = 0.001;

// Функция для проверки, является ли вектор нулевым (с учётом эпсилон)
const isVectorZero = (vec: THREE.Vector3, eps = 0.000001): boolean =>
  Math.abs(vec.x) < eps && Math.abs(vec.y) < eps && Math.abs(vec.z) < eps;

const WhileLine: React.FC<WhileLineProps> = ({
                                               aggregator,
                                               betPosition,
                                               userPreviousBet,
                                               visible,
                                               sphereRef,
                                             }) => {

  console.log("aggregator", aggregator); //{x: 1.1776786463746987, y: 1.6165002337992584, z: 1}
  console.log("betPosition", betPosition); //{x: 2.0221739297110446, y: 1.810893122476757, z: 2}
  console.log("userPreviousBet", userPreviousBet); //{x: 0.025269769384266567, y: 491867.58187563525, z: 1}
  // Ссылка на группу (объект Three.js, содержащий все наши элементы)
  const groupRef = useRef<THREE.Group>(null);
  // Ссылки на линию и конус, которые будут отрисованы для ставки
  const whiteLineRef = useRef<Line2 | null>(null);
  const whiteConeRef = useRef<THREE.Mesh | null>(null);
  // Локальные состояния для определения, наведён ли курсор на элемент, и для отображения текста риска
  const [hovered, setHovered] = useState(false);
  const [riskText, setRiskText] = useState("");

  // Мемоизированный вектор агрегатора, масштабированный и с фиксированным z = 1.
  // Этот вектор служит текущей "ценой", по которой будем сравнивать ставку.
  const scaledAggregator = useMemo(() => {
    console.log("мяу aggregator", aggregator)
    const scaled = aggregator.clone().multiplyScalar(scaleFactor); //(00)
    scaled.z = 1;
    console.log("scaled aggregator", scaled);
    return scaled;
  }, [aggregator]);

  // Мемоизированная позиция ставки, масштабированная и с фиксированным z = 2.
  // Это позиция, установленная пользователем.
  const scaledBet = useMemo(() => {
    if (!betPosition) return null;
    const scaled = betPosition.clone().multiplyScalar(scaleFactor);
    scaled.z = 2;
    return scaled;
  }, [betPosition]);

  // useEffect для первоначальной отрисовки элементов (линия, конус, сфера)
  useEffect(() => {
    // Если компонент не видим или группа не создана, ничего не делаем
    if (!visible) return;
    if (!groupRef.current) return;

    // Если нет позиции ставки или масштабированной ставки, удаляем все дочерние элементы группы
    if (!betPosition || !scaledBet) {
      groupRef.current.children.forEach((child) => groupRef.current?.remove(child));
      whiteLineRef.current = null;
      whiteConeRef.current = null;
      return;
    }

    // Создание линии между агрегатором и ставкой
    const wGeom = new LineGeometry();
    // Устанавливаем позиции линии: от scaledAggregator до scaledBet
    wGeom.setPositions([
      scaledAggregator.x,
      scaledAggregator.y,
      scaledAggregator.z,
      scaledBet.x,
      scaledBet.y,
      scaledBet.z,
    ]);
    const wMat = new LineMaterial({
      color: "white", // Изначально цвет линии – белый
      linewidth: 3,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
    const wLine = new Line2(wGeom, wMat);
    whiteLineRef.current = wLine;
    groupRef.current.add(wLine); // Добавляем линию в группу

    // Создание наконечника стрелки в виде конуса
    const wCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.3, 12),
      new THREE.MeshStandardMaterial({ color: "white" }) // Изначально цвет конуса – белый
    );
    // Располагаем конус в конце линии (в точке ставки)
    wCone.position.copy(scaledBet);
    wCone.position.z = 2;
    // Определяем направление конуса: по умолчанию оно – вдоль оси Y (0,1,0)
    const defaultDir = new THREE.Vector3(0, 1, 0);
    let desiredDir: THREE.Vector3;
    // Если предыдущая ставка пользователя – нулевая, направление берём из позиции ставки
    if (isVectorZero(userPreviousBet)) {
      desiredDir = new THREE.Vector3(betPosition.x, betPosition.y, 2).normalize();
    } else {
      // Иначе, направление рассчитывается как разность между позицией ставки и агрегатором
      desiredDir = betPosition.clone().sub(aggregator).normalize();
    }
    // Если полученное направление не нулевое, вычисляем кватернион для поворота конуса
    if (desiredDir.length() > 0) {
      const quat = new THREE.Quaternion().setFromUnitVectors(defaultDir, desiredDir);
      wCone.setRotationFromQuaternion(quat);
    }
    whiteConeRef.current = wCone;
    groupRef.current.add(wCone);

    // Создание сферы для hit-тестинга и отображения tooltip при наведении курсора
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

    // Привязываем обработчики событий через свойства onPointerOver и onPointerOut
    // Эти свойства поддерживаются react‑three‑fiber для JSX-элементов
    const pointerProps = sph as unknown as {
      onPointerOver?: () => void;
      onPointerOut?: () => void;
    };
    // При наведении курсора устанавливаем hovered в true
    pointerProps.onPointerOver = () => setHovered(true);
    // При уходе курсора – в false
    pointerProps.onPointerOut = () => setHovered(false);

    // Функция очистки: удаляем все добавленные элементы и обнуляем обработчики
    return () => {
      groupRef.current?.remove(wLine);
      groupRef.current?.remove(wCone);
      groupRef.current?.remove(sph);
      pointerProps.onPointerOver = undefined;
      pointerProps.onPointerOut = undefined;
    };
  }, [aggregator, betPosition, scaledBet, userPreviousBet, visible, sphereRef, scaledAggregator]);

  // useEffect для обновления позиций объектов при изменениях входных данных
  useEffect(() => {
    if (!visible) return;
    // Пересчитываем агрегатор
    const updatedAgg = aggregator.clone().multiplyScalar(scaleFactor);
    updatedAgg.z = 1;
    if (!betPosition) return;
    // Пересчитываем позицию ставки
    const updatedBet = betPosition.clone().multiplyScalar(scaleFactor);
    updatedBet.z = 2;
    // Обновляем позицию линии, если она существует
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
    // Обновляем позицию конуса и его поворот
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
    // Обновляем позицию сферы
    if (sphereRef.current) {
      sphereRef.current.position.copy(updatedBet);
      sphereRef.current.position.z = updatedBet.z;
    }
    // Если у линии есть атрибуты позиции, помечаем их как нуждающиеся в обновлении
    if (
      whiteLineRef.current &&
      whiteLineRef.current.geometry &&
      whiteLineRef.current.geometry.attributes.position
    ) {
      whiteLineRef.current.geometry.attributes.position.needsUpdate = true;
    }
  }, [aggregator, betPosition, visible, sphereRef]);

  // useFrame: обновление цвета стрелки, анимации наконечника и текста tooltip в каждом кадре
  useFrame((state) => {
    if (!betPosition || !scaledBet) return;
    // Вычисляем разницу по оси цены (x) между агрегатором и ставкой
    console.log("йоу scaledAggregator.x, scaledBet.x, scaledAggregator.x - scaledBet.x")
    console.log(scaledAggregator.x, scaledBet.x, scaledAggregator.x - scaledBet.x)
    console.log(scaledAggregator.y, scaledBet.y, scaledAggregator.y - scaledBet.y)

    const priceDiff = Math.abs(scaledAggregator.y - scaledBet.y);
    // Текущая цена определяется как x агрегатора
    const currentPrice = scaledAggregator.y;
    // Если разница меньше порога, риск равен 0, иначе рискFraction = разница / текущая цена
    const riskFraction = priceDiff < PRICE_DIFF_THRESHOLD ? 0 : priceDiff / currentPrice;

    // Изначально всегда устанавливаем белый цвет
    let newColorStr = "white";
    let newRiskText = "";
    // Если риск не нулевой, изменяем цвет в зависимости от уровня риска:
    if (riskFraction === 0) {
      newColorStr = "white";
      newRiskText = "";
    } else if (riskFraction < 0.05) {
      newColorStr = "green"; // низкий риск
      newRiskText = "Низкий риск";
    } else if (riskFraction < 0.15) {
      newColorStr = "orange"; // средний риск
      newRiskText = "Средний риск";
    } else {
      newColorStr = "red"; // высокий риск
      newRiskText = riskFraction < 0.30 ? "Высокий риск – опасно" : "Критический риск";
    }

    // Обновляем цвет линии
    if (whiteLineRef.current) {
      (whiteLineRef.current.material as LineMaterial).color.set(newColorStr);
    }
    // Обновляем цвет и анимацию наконечника (конуса)
    if (whiteConeRef.current) {
      (whiteConeRef.current.material as THREE.MeshStandardMaterial).color.set(newColorStr);
      // Если риск критический (≥30%), применяем пульсацию
      if (riskFraction >= 0.30) {
        const pulse = 1 + 0.1 * Math.sin(state.clock.elapsedTime * 10);
        whiteConeRef.current.scale.set(pulse, pulse, pulse);
      } else {
        whiteConeRef.current.scale.set(1, 1, 1);
      }
    }
    // Если курсор наведён, обновляем текст tooltip
    if (hovered && newRiskText !== riskText) {
      setRiskText(newRiskText);
    }
  });

  return (
    // Группа, содержащая все объекты стрелки
    <group ref={groupRef}>
      {/* Если курсор наведён, отображаем tooltip с текстом риска */}
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

// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

interface HistoricalVectorsProps {
  /** Массив векторов, например: [[a, b], [a, b], …] */
  vectors: Array<[number, number]>;
  /**
   * Временной шаг не используется напрямую, так как горизонтальное распределение определяется количеством векторов.
   * Можно добавить, если нужно смещать начальную точку.
   */
  // deltaTime?: number;
  /**
   * Коэффициент масштабирования для первой компоненты result vector (отображается по оси Y).
   * По умолчанию 1.
   */
  scaleY?: number;
  /**
   * Коэффициент масштабирования для второй компоненты result vector (отображается по оси Z).
   * По умолчанию 1.
   */
  scaleZ?: number;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  /** Единичный вектор направления стрелки */
  direction: THREE.Vector3;
  color?: string;
  /** Масштаб для размеров наконечника стрелки */
  coneScale?: number;
}

const Arrow: React.FC<ArrowProps> = ({ start, end, direction, color = "yellow", coneScale = 1 }) => {
  // Создаем линию стрелки
  const lineGeometry = useMemo(() => {
    const geometry = new LineGeometry();
    geometry.setPositions([start.x, start.y, start.z, end.x, end.y, end.z]);
    return geometry;
  }, [start, end]);

  const lineMaterial = useMemo(() => {
    return new LineMaterial({
      color,
      linewidth: 2,
      resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
    });
  }, [color]);

  const coneQuaternion = useMemo(() => {
    const defaultDir = new THREE.Vector3(0, 1, 0); // по умолчанию конус смотрит вверх
    return new THREE.Quaternion().setFromUnitVectors(defaultDir, direction);
  }, [direction]);

  return (
    <group>
      <line2 geometry={lineGeometry} material={lineMaterial} />
      <mesh position={end} quaternion={coneQuaternion}>
        <coneGeometry args={[0.1 * coneScale, 0.3 * coneScale, 12]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
};

const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               scaleY = 1,
                                                               scaleZ = 1,
                                                             }) => {
  console.log("HistoricalVectors received vectors:", vectors);

  // Число векторов:
  const count = vectors.length;
  // Если только один вектор, deltaX = 0; если больше, то горизонтальное распределение от 0 до 5:
  const deltaX = count > 1 ? 5 / (count - 1) : 0;

  // Начальная точка: по оси времени (X) начинается с 0, базовая Y = 0, z = 1
  const startPoint = new THREE.Vector3(0, 0, 1);

  // Вычисляем масштаб для наконечников: например, базовый размер для 2 векторов, уменьшаем при увеличении count
  const coneScale = Math.max(0.3, Math.sqrt(5 / (count - 1)));
  console.log("Computed coneScale:", coneScale);

  // Вычисляем непрерывную цепочку стрелок:
  // Каждый элемент: P₀ = (0, 0, 1)
  // Для i-го вектора, смещение = (deltaX, a_i * scaleY, b_i * scaleZ)
  // Новый конец = Pᵢ + смещение
  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];
    let currentPoint = startPoint.clone();
    vectors.forEach((vec, i) => {
      // Вычисляем фиксированное горизонтальное смещение (по оси X)
      const offsetX = deltaX;
      // Смещение по осям Y и Z определяется входными данными:
      const offsetY = vec[0] * scaleY;
      const offsetZ = vec[1] * scaleZ;
      const offset = new THREE.Vector3(offsetX, offsetY, offsetZ);
      const nextPoint = currentPoint.clone().add(offset);
      // Направление стрелки – это нормализованный offset (если offset.length() === 0, используем [0,1,0])
      const direction = offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();
      chain.push({ start: currentPoint.clone(), end: nextPoint.clone(), direction });
      console.log(
        `Vector ${i}: start=${currentPoint.toArray()}, offset=${offset.toArray()}, end=${nextPoint.toArray()}, direction=${direction.toArray()}`
      );
      currentPoint = nextPoint.clone();
    });
    console.log("Computed arrowChain:", chain.map(item => ({
      start: item.start.toArray(),
      end: item.end.toArray(),
      direction: item.direction.toArray(),
    })));
    return chain;
  }, [vectors, deltaX, scaleY, scaleZ]);

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow
          key={i}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color="yellow"
          coneScale={coneScale}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;

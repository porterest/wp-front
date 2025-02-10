// HistoricalVectors.tsx
import React, { useMemo } from "react";
import * as THREE from "three";
import { extend } from "@react-three/fiber";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// Регистрируем компоненты для использования в JSX
extend({ Line2, LineGeometry, LineMaterial });

/**
 * Интерфейс свойств для HistoricalVectors.
 *
 * @param vectors Массив векторов вида [number, number] – два компонента смещения.
 * @param totalTime Общая длина оси времени, по которой распределяются стрелки (по умолчанию 5).
 * @param accumulate Если true – стрелки строятся как цепочка (каждая начинается там, где закончилась предыдущая),
 *                   иначе каждая стрелка отрисовывается независимо (с позицией, зависящей от её индекса).
 * @param startPoint Начальная точка цепочки (по умолчанию (0, 0, 0)).
 * @param timeAxis Ось, по которой располагаются векторы (время). Возможные значения: "x", "y", "z".
 *                 Например, если указать "z" – базовая позиция стрелки определяется вдоль оси Z.
 * @param scaleA Коэффициент масштабирования для первой компоненты вектора (будет применён к первой из оставшихся осей).
 * @param scaleB Коэффициент масштабирования для второй компоненты вектора (для второй оставшейся оси).
 * @param fixedCoordinates Если задать, то для каждой вычисленной точки принудительно устанавливается указанное значение
 *                         для соответствующей координаты (например, { z: 1 }).
 * @param color Цвет стрелок (по умолчанию "yellow").
 */
interface HistoricalVectorsProps {
  vectors: Array<[number, number]>;
  totalTime?: number;
  accumulate?: boolean;
  startPoint?: THREE.Vector3;
  timeAxis?: "x" | "y" | "z";
  scaleA?: number;
  scaleB?: number;
  fixedCoordinates?: Partial<Record<"x" | "y" | "z", number>>;
  color?: string;
}

interface ArrowProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  /** Единичный вектор направления стрелки */
  direction: THREE.Vector3;
  color?: string;
  coneScale?: number;
}

/**
 * Компонент стрелки.
 * Рисует линию между точками start и end и конус в конце, ориентированный по вектору direction.
 */
const Arrow: React.FC<ArrowProps> = ({
                                       start,
                                       end,
                                       direction,
                                       color = "yellow",
                                       coneScale = 1,
                                     }) => {
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

/**
 * Компонент HistoricalVectors.
 * В зависимости от флага accumulate стрелки либо располагаются независимо вдоль оси времени,
 * либо строятся цепочкой – каждая следующая начинается там, где закончилась предыдущая.
 *
 * При этом ось времени (timeAxis) определяется пропсом, а оставшиеся две оси получают
 * смещения, вычисляемые по входным векторам с коэффициентами scaleA и scaleB.
 */
const HistoricalVectors: React.FC<HistoricalVectorsProps> = ({
                                                               vectors,
                                                               totalTime = 5,
                                                               accumulate = true,
                                                               startPoint = new THREE.Vector3(0, 0, 0),
                                                               timeAxis = "z",
                                                               scaleA = 1,
                                                               scaleB = 1,
                                                               fixedCoordinates, // например, { z: 1 } чтобы все точки лежали в плоскости z=1
                                                               color = "yellow",
                                                             }) => {
  // Общее количество векторов
  const count = vectors.length;
  // Если больше одного вектора, вычисляем шаг по оси времени
  const delta = count > 1 ? totalTime / (count - 1) : 0;

  // Определяем, какие оси будут использоваться для смещений.
  // Из набора ["x", "y", "z"] исключаем ось времени.
  const allAxes: ("x" | "y" | "z")[] = ["x", "y", "z"];
  const offsetAxes = allAxes.filter((ax) => ax !== timeAxis) as ("x" | "y" | "z")[];

  const arrowChain = useMemo(() => {
    const chain: { start: THREE.Vector3; end: THREE.Vector3; direction: THREE.Vector3 }[] = [];

    if (accumulate) {
      // Режим цепочки с накоплением: каждая стрелка начинается там, где закончилась предыдущая
      let currentPoint = startPoint.clone();
      // При наличии fixedCoordinates применяем их к начальной точке
      if (fixedCoordinates) {
        for (const [axis, value] of Object.entries(fixedCoordinates)) {
          // @ts-expect-error meow
          currentPoint[axis] = value;
        }
      }
      for (let i = 0; i < count; i++) {
        const vec = vectors[i];
        // Вычисляем смещение: вдоль оси времени всегда добавляем delta,
        // а для остальных осей — умноженное на scaleA и scaleB соответственно
        const offset = new THREE.Vector3(0, 0, 0);
        // Смещение вдоль оси времени
        offset[timeAxis] = delta;
        // Остальные две оси:
        offset[offsetAxes[0]] = vec[0] * scaleA;
        offset[offsetAxes[1]] = vec[1] * scaleB;

        const nextPoint = currentPoint.clone().add(offset);

        // Если нужно зафиксировать значение координаты (например, чтобы все точки лежали в одной плоскости),
        // применяем фиксированные значения к текущей и следующей точкам.
        if (fixedCoordinates) {
          for (const [axis, value] of Object.entries(fixedCoordinates)) {
            // @ts-expect-error meow
            currentPoint[axis] = value;
            // @ts-expect-error meow
            nextPoint[axis] = value;
          }
        }

        const direction =
          offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();

        chain.push({
          start: currentPoint.clone(),
          end: nextPoint.clone(),
          direction,
        });
        currentPoint = nextPoint.clone();
      }
    } else {
      // Режим независимого размещения:
      // Каждая стрелка отрисовывается в позиции, зависящей от её индекса вдоль оси времени,
      // а смещение в остальных направлениях задаётся входным вектором.
      for (let i = 0; i < count; i++) {
        const vec = vectors[i];
        const basePoint = startPoint.clone();
        basePoint[timeAxis] = i * delta;

        const offset = new THREE.Vector3(0, 0, 0);
        offset[offsetAxes[0]] = vec[0] * scaleA;
        offset[offsetAxes[1]] = vec[1] * scaleB;

        const endPoint = basePoint.clone().add(offset);

        if (fixedCoordinates) {
          for (const [axis, value] of Object.entries(fixedCoordinates)) {
            // @ts-expect-error meow
            basePoint[axis] = value;
            // @ts-expect-error meow
            endPoint[axis] = value;
          }
        }

        const direction =
          offset.length() === 0 ? new THREE.Vector3(0, 1, 0) : offset.clone().normalize();

        chain.push({ start: basePoint, end: endPoint, direction });
      }
    }

    return chain;
  }, [
    vectors,
    accumulate,
    count,
    delta,
    startPoint,
    timeAxis,
    offsetAxes,
    scaleA,
    scaleB,
    fixedCoordinates,
  ]);

  // Вычисляем масштаб наконечника стрелки – при большом количестве векторов он уменьшается, но не меньше 0.3
  const coneScale = count > 1 ? Math.max(0.3, Math.sqrt(5 / (count - 1))) : 1;

  return (
    <group>
      {arrowChain.map((arrow, i) => (
        <Arrow
          key={i}
          start={arrow.start}
          end={arrow.end}
          direction={arrow.direction}
          color={color}
          coneScale={coneScale}
        />
      ))}
    </group>
  );
};

export default HistoricalVectors;

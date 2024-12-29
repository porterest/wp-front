import React, { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

interface PairVectorsProps {
  selectedPair: string | null;
  previousBetEnd: THREE.Vector3;
  userLastBet: THREE.Vector3;
}

const PairVectors: React.FC<PairVectorsProps> = ({
  selectedPair,
  previousBetEnd,
  userLastBet,
}) => {
  const { scene } = useThree();

  useEffect(() => {
    console.log('selectedPair: ', selectedPair);
    console.log('previousBetEnd: ', previousBetEnd);
    console.log('userLastBet: ', userLastBet);
    if (!previousBetEnd || !userLastBet) return;

    const startArrow = drawArrow(
      new THREE.Vector3(0, 0, 0),
      previousBetEnd,
      0xff0000,
    ); // Red Arrow
    const userArrow = drawArrow(previousBetEnd, userLastBet, 0x00ff00); // Green Arrow
    console.log('removing');
    // Cleanup on unmount
    return () => {
      scene.remove(startArrow);
      scene.remove(userArrow);
    };
  }, [selectedPair, previousBetEnd, userLastBet]);

  const drawArrow = (
    start: THREE.Vector3,
    end: THREE.Vector3,
    color: number = 0xff0000,
  ): THREE.ArrowHelper => {
    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3().subVectors(end, start).normalize(),
      start,
      start.distanceTo(end),
      color,
    );
    scene.add(arrowHelper);
    return arrowHelper;
  };

  return null;
};

export default PairVectors;

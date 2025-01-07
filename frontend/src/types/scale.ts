export type ScaleFunctions = {
  normalizeX: (index: number, length: number) => number;
  normalizeY: (value: number) => number;
  normalizeZ: (volume: number, maxVolume: number) => number;
  denormalizeX: (sceneValue: number, length: number) => number;
  denormalizeY: (sceneValue: number) => number;
  denormalizeZ: (sceneValue: number, maxVolume: number) => number;
};
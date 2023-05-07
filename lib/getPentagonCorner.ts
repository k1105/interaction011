import { calcTriangleCorner } from "./calculator/calcTriangleCorner";

type Props = {
  distanceList: number[];
  l1: number;
  l2: number;
  maxDistId: number;
};

export const getPentagonCorner = ({
  distanceList,
  l1,
  l2,
  maxDistId,
}: Props) => {
  // get corner of pentagon
  const cornerSeg1 = calcTriangleCorner([
    distanceList[(maxDistId + 3) % distanceList.length],
    distanceList[(maxDistId + 4) % distanceList.length],
    l1,
  ]);
  const cornerSeg2 = calcTriangleCorner([l1, distanceList[maxDistId], l2]);
  const cornerSeg3 = calcTriangleCorner([
    l2,
    distanceList[(maxDistId + 1) % distanceList.length],
    distanceList[(maxDistId + 2) % distanceList.length],
  ]);

  const pentagonCorner: number[] = [0, 0, 0, 0, 0];
  pentagonCorner[maxDistId] = cornerSeg2[0] + cornerSeg3[2];
  pentagonCorner[(maxDistId + 1) % distanceList.length] = cornerSeg3[0];
  pentagonCorner[(maxDistId + 2) % distanceList.length] =
    cornerSeg3[1] + cornerSeg1[1] + cornerSeg2[1];
  pentagonCorner[(maxDistId + 3) % distanceList.length] = cornerSeg1[2];
  pentagonCorner[(maxDistId + 4) % distanceList.length] =
    cornerSeg1[0] + cornerSeg2[2];

  return pentagonCorner;
};

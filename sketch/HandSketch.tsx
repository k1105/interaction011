import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { isValidTriangle } from "../lib/isValidTriangle";
import { getPentagonCorner } from "../lib/getPentagonCorner";

type Props = {
  handpose: MutableRefObject<Hand[]>;
};

type Handpose = Keypoint[];

const Sketch = dynamic(import("react-p5"), {
  loading: () => <></>,
  ssr: false,
});

export const HandSketch = ({ handpose }: Props) => {
  let handposeHistory: {
    left: Handpose[];
    right: Handpose[];
  } = { left: [], right: [] };

  let distanceList = [0, 0, 0, 0, 0];
  let cornerList = [0, 0, 0, 0, 0];
  const fingerNames = [
    "thumb",
    "index finger",
    "middle finger",
    "ring finger",
    "pinky",
  ];

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
    p5.textSize(25);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current); //平滑化されていない手指の動きを使用する
    handposeHistory = updateHandposeHistory(rawHands, handposeHistory); //handposeHistoryの更新
    const hands: {
      left: Handpose;
      right: Handpose;
    } = getSmoothedHandpose(rawHands, handposeHistory); //平滑化された手指の動きを取得する

    p5.background(1, 25, 96);

    // --
    // <> pinky
    // <> ring
    // <> middle
    // <> index
    // <> thumb
    // --
    // if one hand is detected, both side of organ is shrink / extend.
    // if two hands are detected, each side of organ changes according to each hand.
    const r = 200; // <の長さ.
    const scale = 3; // 指先と付け根の距離の入力値に対する、出力時に使うスケール比。
    let start: number = 0;
    let end: number = 0;

    if (hands.left.length > 0 || hands.right.length > 0) {
      //右手、左手のうちのどちらかが認識されていた場合
      // 片方の手の動きをもう片方に複製する
      if (hands.left.length == 0) {
        hands.left = hands.right;
      } else if (hands.right.length == 0) {
        hands.right = hands.left;
      }

      p5.translate(window.innerWidth / 2, window.innerHeight / 2);

      const tmpDistanceList = [];
      for (let n = 0; n < 5; n++) {
        start = 4 * n + 1;
        end = 4 * n + 4;
        let d = (hands.left[start].y - hands.left[end].y) * scale;
        if (r < d) {
          d = r;
        } else if (d < 0) {
          d = 10; //三角形として体をなすように. calcTriangleCornerでのzero division error回避
        }

        tmpDistanceList.push(d);
      }

      //validate
      const l1 =
        Math.max(tmpDistanceList[0], tmpDistanceList[1]) +
        Math.min(tmpDistanceList[0], tmpDistanceList[1]) / 2;
      const l2 =
        Math.max(tmpDistanceList[3], tmpDistanceList[4]) +
        Math.min(tmpDistanceList[3], tmpDistanceList[4]) / 2;

      const edgeList = [l1, l2, tmpDistanceList[2]];

      if (isValidTriangle(edgeList)) {
        cornerList = getPentagonCorner({
          distanceList,
          l1,
          l2,
        });
        distanceList = tmpDistanceList;
      }
      for (let i = 0; i < 5; i++) {
        const d = distanceList[i];
        const sign = -1; //正負の符号
        p5.line(0, 0, (sign * Math.sqrt(r ** 2 - d ** 2)) / 2, -d / 2);
        p5.line((sign * Math.sqrt(r ** 2 - d ** 2)) / 2, -d / 2, 0, -d);
        p5.push();
        p5.noStroke();
        p5.text(fingerNames[i], -100, 0);
        p5.pop();

        //全体座標の回転と高さ方向へのtranslate
        p5.translate(0, -d);
        p5.rotate(Math.PI - cornerList[i]);
      }
    }
  };

  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(p5.windowWidth, p5.windowHeight);
  };

  return (
    <>
      <Sketch
        preload={preload}
        setup={setup}
        draw={draw}
        windowResized={windowResized}
      />
    </>
  );
};

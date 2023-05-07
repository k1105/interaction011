import dynamic from "next/dynamic";
import p5Types from "p5";
import { MutableRefObject } from "react";
import { Hand } from "@tensorflow-models/hand-pose-detection";
import { Keypoint } from "@tensorflow-models/hand-pose-detection";
import { convertHandToHandpose } from "../lib/converter/convertHandToHandpose";
import { isValidTriangle } from "../lib/isValidTriangle";
import { getPentagonCorner } from "../lib/getPentagonCorner";
import { getSmoothedValue } from "../lib/calculator/getSmoothedValue";
import { getSmoothedHandpose } from "../lib/getSmoothedHandpose";
import { updateHandposeHistory } from "../lib/updateHandposeHistory";

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
  let leftDistanceListHistory: number[][] = [];
  let leftDistanceList = [0, 0, 0, 0, 0];
  let cornerList = [0, 0, 0, 0, 0];
  const fingerNames = [
    "thumb",
    "index finger",
    "middle finger",
    "ring finger",
    "pinky",
  ];
  let l1: number = 0;
  let l2: number = 0;

  let distanceListHistory: number[][] = [];

  const preload = (p5: p5Types) => {
    // 画像などのロードを行う
  };

  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(p5.windowWidth, p5.windowHeight).parent(canvasParentRef);
    p5.stroke(220);
    p5.fill(255);
    p5.strokeWeight(10);
    p5.textSize(15);
  };

  const draw = (p5: p5Types) => {
    const rawHands: {
      left: Handpose;
      right: Handpose;
    } = convertHandToHandpose(handpose.current); //平滑化されていない手指の動きを使用する
    updateHandposeHistory(rawHands, handposeHistory);
    const hands = getSmoothedHandpose(rawHands, handposeHistory);

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
    const scale = 2; // 指先と付け根の距離の入力値に対する、出力時に使うスケール比。
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

      // p5.fill(220);
      // p5.ellipse(0, 0, 80);

      const leftDistanceListRaw = [];
      for (let n = 0; n < 5; n++) {
        start = 4 * n + 1;
        end = 4 * n + 4;
        let d =
          Math.sqrt(
            (hands.left[start].x - hands.left[end].x) ** 2 +
              (hands.left[start].y - hands.left[end].y) ** 2
          ) * scale;
        if (r < d) {
          d = r;
        }
        leftDistanceListRaw.push(d);
      }

      //update leftDistanceListHistory:
      leftDistanceListHistory.push(leftDistanceListRaw);
      if (leftDistanceListHistory.length > 5) {
        leftDistanceListHistory.shift();
      }

      leftDistanceList = getSmoothedValue(leftDistanceListHistory, 5);
      //ログの出力に使用
      distanceListHistory.push(leftDistanceList);
      // if (distanceListHistory.length > 300) {
      //   console.log(JSON.stringify(distanceListHistory));
      //   distanceListHistory = [];
      // }

      const maxDist: { value: number; id: number } = { value: 0, id: 0 };

      for (let i = 0; i < 5; i++) {
        if (leftDistanceList[i] > maxDist.value) {
          //代入されていくdistのうち最大のものを保存しておく
          maxDist.value = leftDistanceList[i];
          maxDist.id = i;
        }
      }

      for (let i = 0; i < 5; i++) {
        if (leftDistanceList[i] < maxDist.value / 3) {
          leftDistanceList[i] = maxDist.value / 3 + 0.01;
        }
      }

      l1 =
        (Math.max(
          leftDistanceList[(maxDist.id + 3) % 5],
          leftDistanceList[(maxDist.id + 4) % 5]
        ) +
          Math.min(
            leftDistanceList[(maxDist.id + 3) % 5] +
              leftDistanceList[(maxDist.id + 4) % 5],
            leftDistanceList[(maxDist.id + 1) % 5] +
              leftDistanceList[(maxDist.id + 2) % 5] +
              maxDist.value
          )) /
        2;
      l2 =
        (Math.max(
          leftDistanceList[(maxDist.id + 1) % 5],
          leftDistanceList[(maxDist.id + 2) % 5]
        ) +
          Math.min(
            leftDistanceList[(maxDist.id + 1) % 5] +
              leftDistanceList[(maxDist.id + 2) % 5],
            leftDistanceList[(maxDist.id + 3) % 5] +
              leftDistanceList[(maxDist.id + 4) % 5] +
              maxDist.value
          )) /
        2;

      cornerList = getPentagonCorner({
        distanceList: leftDistanceList,
        l1,
        l2,
        maxDistId: maxDist.id,
      });
      p5.push();
      p5.noStroke();
      p5.translate(-p5.width / 2 + 10, -p5.height / 2 + 10);
      // for (let i = 0; i < leftDistanceList.length; i++) {
      //   p5.translate(0, 20);
      //   p5.text(leftDistanceList[i], 0, 0);
      //   p5.push();
      //   p5.translate(200, 0);
      //   p5.text(cornerList[i], 0, 0);
      //   p5.pop();
      // }
      p5.pop();

      for (let i = 0; i < 5; i++) {
        const d = leftDistanceList[i];
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

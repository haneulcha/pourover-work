import type { BrewMethod, BrewMethodId, DripperId } from "../types";
import { april } from "./april";
import { caffeLuxxe } from "./caffe-luxxe";
import { frothyMonkey } from "./frothy-monkey";
import { fuglenTokyo } from "./fuglen-tokyo";
import { hoffmannV60 } from "./hoffmann-v60";
import { kasuya46 } from "./kasuya-4-6";
import { kurasuKyoto } from "./kurasu-kyoto";
import { scottRao } from "./scott-rao";
import { standard3Stage } from "./standard-3-stage";

export const brewMethods: Record<BrewMethodId, BrewMethod> = {
  kasuya_4_6: kasuya46,
  hoffmann_v60: hoffmannV60,
  scott_rao: scottRao,
  april,
  kurasu_kyoto: kurasuKyoto,
  frothy_monkey: frothyMonkey,
  standard_3_stage: standard3Stage,
  caffe_luxxe: caffeLuxxe,
  fuglen_tokyo: fuglenTokyo,
};

export const methodList: readonly BrewMethod[] = Object.values(brewMethods);

export const methodsForDripper = (dripper: DripperId): readonly BrewMethod[] =>
  methodList.filter((m) => m.supportedDrippers.includes(dripper));

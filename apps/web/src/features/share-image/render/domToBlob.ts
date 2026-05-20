import { toBlob } from "html-to-image";

// iOS Safari가 foreignObject를 canvas로 변환할 때, 내부 <img>가 디코딩
// 완료되기 전에 스냅샷을 떠서 사진 영역이 빈칸으로 나오는 race가 있음.
// 각 <img>의 decode()를 await 해서 픽셀 데이터 준비를 강제한다.
// 개별 decode 실패는 swallow — broken src 한 장 때문에 전체가 무너지지 않도록.
const awaitImageDecodes = async (node: HTMLElement): Promise<void> => {
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      if (typeof img.decode !== "function") return;
      try {
        await img.decode();
      } catch {
        // best-effort
      }
    }),
  );
};

export const domToBlob = async (
  node: HTMLElement,
  opts: {
    readonly width: number;
    readonly height: number;
    readonly pixelRatio?: number;
  },
): Promise<Blob> => {
  await awaitImageDecodes(node);
  // Do NOT enable `cacheBust`. The photo is inlined as a `data:` URL by
  // `usePhoto`; cacheBust appends `?date=...` to every img src, which iOS
  // Safari treats as a different (invalid) resource when cloning the node
  // into the foreignObject, leaving the photo cell blank in the exported PNG.
  const blob = await toBlob(node, {
    width: opts.width,
    height: opts.height,
    pixelRatio: opts.pixelRatio ?? 2,
  });
  if (blob == null) {
    throw new Error("domToBlob: html-to-image returned null");
  }
  return blob;
};

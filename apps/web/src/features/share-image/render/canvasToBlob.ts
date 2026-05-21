// Promise wrapper around HTMLCanvasElement.toBlob. Centralized so test
// mocking has a single target and the dialog stays agnostic of the format
// negotiation. Defaults to PNG; quality is forwarded for lossy formats.
export const canvasToBlob = (
  canvas: HTMLCanvasElement,
  type: string = "image/png",
  quality?: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob == null) {
          reject(new Error("canvasToBlob: toBlob returned null"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });

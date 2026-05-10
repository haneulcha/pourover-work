export type ShareOutcome = "shared" | "downloaded" | "cancelled" | "failed";

export const canNativeShareImage = (): boolean => {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.canShare !== "function") return false;
  const probe = new File([], "probe.png", { type: "image/png" });
  try {
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const shareOrDownload = async (
  blob: Blob,
  filename: string,
): Promise<ShareOutcome> => {
  if (!canNativeShareImage()) {
    downloadBlob(blob, filename);
    return "downloaded";
  }
  const file = new File([blob], filename, { type: blob.type });
  try {
    await navigator.share({ files: [file] });
    return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "cancelled";
    }
    return "failed";
  }
};

import { useRef, type ChangeEvent } from "react";

type Props = {
  readonly onPick: (file: File) => void;
};

export function PhotoPicker({ onPick }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file != null) onPick(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="rounded-button border border-text-primary bg-surface-soft py-3.5 text-body-sm font-medium transition-colors hover:bg-surface-strong"
      >
        사진 찍기
      </button>
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        className="rounded-button border border-surface-hairline bg-surface py-3.5 text-body-sm font-medium transition-colors hover:bg-surface-strong"
      >
        갤러리에서 선택
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        data-source="camera"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        data-source="gallery"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

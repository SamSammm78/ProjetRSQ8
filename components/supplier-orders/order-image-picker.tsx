"use client";

/* eslint-disable @next/next/no-img-element */
import { Camera, ImagePlus, X } from "lucide-react";

const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp";

export function OrderImagePicker({
  files,
  onChange
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) {
  function addFiles(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    const nextFiles = [...files, ...Array.from(fileList)].slice(0, 10);
    onChange(nextFiles);
  }

  function removeFile(index: number) {
    onChange(files.filter((_, fileIndex) => fileIndex !== index));
  }

  return (
    <section className="grid gap-3 xl:col-span-4">
      <p className="text-sm font-medium text-ink/70">Images de la commande</p>
      <div
        className="grid gap-3 rounded-lg border border-dashed border-moss bg-mist p-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          addFiles(event.dataTransfer.files);
        }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="focus-ring inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-sage bg-white px-4 font-semibold">
            <Camera size={18} />
            Prendre une photo
            <input
              className="sr-only"
              accept={ACCEPTED_IMAGES}
              capture="environment"
              multiple
              type="file"
              onChange={(event) => addFiles(event.target.files)}
            />
          </label>
          <label className="focus-ring inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border border-sage bg-white px-4 font-semibold">
            <ImagePlus size={18} />
            Choisir dans la galerie
            <input
              className="sr-only"
              accept={ACCEPTED_IMAGES}
              multiple
              type="file"
              onChange={(event) => addFiles(event.target.files)}
            />
          </label>
        </div>
        <p className="text-xs text-ink/55">JPG, JPEG, PNG, WEBP. Maximum 10 images.</p>
      </div>

      {files.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-lg border border-sage bg-white">
              <img
                alt={file.name}
                className="aspect-square w-full object-cover"
                src={URL.createObjectURL(file)}
              />
              <button
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-white/95 text-clay shadow-soft"
                onClick={() => removeFile(index)}
                type="button"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Download, ImagePlus, Trash2, X } from "lucide-react";
import {
  deleteSupplierOrderImage,
  replaceSupplierOrderImage,
  uploadSupplierOrderImages
} from "@/lib/supplier-orders";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SupplierOrder, SupplierOrderImage } from "@/lib/types";

const ACCEPTED_IMAGES = "image/jpeg,image/png,image/webp";

export function OrderDetailModal({
  onClose,
  onOrderChange,
  order
}: {
  onClose: () => void;
  onOrderChange: (order: SupplierOrder) => void;
  order: SupplierOrder;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState("");
  const activeImage = order.images[activeIndex];

  async function addImages(fileList: FileList | null) {
    if (!fileList) {
      return;
    }

    setError("");

    try {
      const files = Array.from(fileList);
      const images = await uploadSupplierOrderImages(order.id, files, order.images.length);
      onOrderChange({ ...order, images: [...order.images, ...images] });
    } catch (caughtError) {
      console.error("Erreur Supabase image commande", caughtError);
      const message = caughtError instanceof Error ? caughtError.message : "Erreur Supabase";
      setError(message);
      window.alert(`Erreur Supabase : ${message}`);
    }
  }

  async function deleteImage(image: SupplierOrderImage) {
    setError("");

    try {
      await deleteSupplierOrderImage(image);
      const nextImages = order.images.filter((currentImage) => currentImage.id !== image.id);
      setActiveIndex(0);
      onOrderChange({ ...order, images: nextImages });
    } catch (caughtError) {
      console.error("Erreur Supabase suppression image", caughtError);
      const message = caughtError instanceof Error ? caughtError.message : "Erreur Supabase";
      setError(message);
      window.alert(`Erreur Supabase : ${message}`);
    }
  }

  async function replaceImage(image: SupplierOrderImage, fileList: FileList | null) {
    if (!fileList?.[0]) {
      return;
    }

    setError("");

    try {
      const nextImage = await replaceSupplierOrderImage(image, fileList[0]);
      onOrderChange({
        ...order,
        images: order.images.map((currentImage) =>
          currentImage.id === image.id ? nextImage : currentImage
        )
      });
    } catch (caughtError) {
      console.error("Erreur Supabase remplacement image", caughtError);
      const message = caughtError instanceof Error ? caughtError.message : "Erreur Supabase";
      setError(message);
      window.alert(`Erreur Supabase : ${message}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/70 p-3">
      <section className="mx-auto grid max-w-5xl gap-4 rounded-lg bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-moss">{order.platform || "Commande"}</p>
            <h2 className="text-xl font-semibold">{order.orderNumber || "Detail commande"}</h2>
            <p className="mt-1 text-sm text-ink/60">
              {formatDate(order.orderDate)} · {formatCurrency(order.totalAmount)} · {order.country || "-"}
            </p>
          </div>
          <button
            className="focus-ring grid h-10 w-10 place-items-center rounded-lg border border-sage"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Compte utilise" value={order.accountUsed || "-"} />
          <Info label="Lien commande" value={order.orderLink || "-"} href={order.orderLink} />
          <Info label="Notes" value={order.notes || "-"} />
          <Info label="Images" value={`📷 ${order.images.length}`} />
        </div>

        {error ? <p className="text-sm font-medium text-clay">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <label className="focus-ring inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-moss px-4 text-sm font-semibold text-white">
            <ImagePlus size={18} />
            Ajouter des images
            <input
              className="sr-only"
              accept={ACCEPTED_IMAGES}
              multiple
              type="file"
              onChange={(event) => addImages(event.target.files)}
            />
          </label>
        </div>

        {activeImage ? (
          <div className="grid gap-3">
            <div className="overflow-hidden rounded-lg border border-sage bg-mist">
              <img
                alt={activeImage.fileName}
                className="max-h-[72vh] w-full touch-pan-x touch-pan-y object-contain"
                src={activeImage.imageUrl}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-sage px-3 text-sm font-semibold"
                download={activeImage.fileName}
                href={activeImage.imageUrl}
                target="_blank"
              >
                <Download size={16} />
                Telecharger
              </a>
              <label className="focus-ring inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-sage px-3 text-sm font-semibold">
                <ImagePlus size={16} />
                Remplacer
                <input
                  className="sr-only"
                  accept={ACCEPTED_IMAGES}
                  type="file"
                  onChange={(event) => replaceImage(activeImage, event.target.files)}
                />
              </label>
              <button
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-lg border border-sage px-3 text-sm font-semibold text-clay"
                onClick={() => deleteImage(activeImage)}
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-sage bg-mist p-8 text-center text-sm text-ink/60">
            Aucune image associee a cette commande.
          </div>
        )}

        {order.images.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {order.images.map((image, index) => (
              <button
                key={image.id}
                className={`overflow-hidden rounded-lg border ${
                  index === activeIndex ? "border-moss" : "border-sage"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                <img alt={image.fileName} className="aspect-square w-full object-cover" src={image.imageUrl} />
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Info({ href, label, value }: { href?: string; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-mist p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-ink/55">{label}</p>
      {href ? (
        <a className="mt-1 block font-semibold text-moss underline" href={href} target="_blank" rel="noreferrer">
          Ouvrir
        </a>
      ) : (
        <p className="mt-1 font-semibold">{value}</p>
      )}
    </div>
  );
}

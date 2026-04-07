"use client";

import { ImageUpload } from "@/components/ui/image-upload";
import {
  uploadItemPhotoAction,
  removeItemPhotoAction,
} from "@/app/actions/inventory-items";

interface ItemPhotoUploadProps {
  itemId: string;
  initialPhotoBase64: string | null;
}

export function ItemPhotoUpload({
  itemId,
  initialPhotoBase64,
}: ItemPhotoUploadProps) {
  return (
    <ImageUpload
      currentImage={initialPhotoBase64}
      onUpload={(formData) => uploadItemPhotoAction(itemId, formData)}
      onRemove={() => removeItemPhotoAction(itemId)}
      fieldName="photo"
      alt="Item photo"
    />
  );
}

import { useRef, useState } from "react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  ImageAdd01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  useDeletePhotoMutation,
  useGetPhotosQuery,
  useUpdateCarMutation,
  useUploadPhotoMutation,
} from "../../app/api.js";
import { errorText } from "../../lib/format.js";
import { ConfirmDelete } from "../ConfirmDelete/ConfirmDelete.jsx";
import { Icon } from "../Icon/Icon.jsx";

const PhotoViewer = ({ car, photos, open, index, onIndexChange, onClose }) => {
  const [updateCar, coverState] = useUpdateCarMutation();
  const [deletePhoto, deleteState] = useDeletePhotoMutation();
  const photo = photos[index];
  const isCover = photo?.id === car.coverPhotoId;

  const onDelete = async () => {
    try {
      await deletePhoto(photo.id).unwrap();

      if (photos.length === 1) {
        onClose();
      } else {
        onIndexChange(Math.min(index, photos.length - 2));
      }
    } catch {
      // The photo stays visible, so the user can try again.
    }
  };

  return (
    <Dialog open={open && Boolean(photo)} onOpenChange={(isOpen) => (isOpen ? null : onClose())}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 flex h-svh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none bg-black/95 p-0 ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Zdjęcie auta {car.name}</DialogTitle>
        <div className="flex items-center justify-between px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 text-white">
          <span className="text-sm text-white/70">
            {index + 1} / {photos.length}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Zamknij"
            className="text-white hover:bg-white/10"
            onClick={onClose}
          >
            <Icon icon={Cancel01Icon} size={22} />
          </Button>
        </div>
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {photo ? (
            <img src={photo.url} alt="" className="max-h-full max-w-full object-contain" />
          ) : null}
          {index > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Poprzednie zdjęcie"
              className="absolute left-2 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={() => onIndexChange(index - 1)}
            >
              <Icon icon={ArrowLeft01Icon} size={22} />
            </Button>
          ) : null}
          {index < photos.length - 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              aria-label="Następne zdjęcie"
              className="absolute right-2 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={() => onIndexChange(index + 1)}
            >
              <Icon icon={ArrowRight01Icon} size={22} />
            </Button>
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant={isCover ? "secondary" : "default"}
            size="lg"
            disabled={isCover || coverState.isLoading}
            onClick={() => updateCar({ id: car.id, coverPhotoId: photo.id })}
          >
            <Icon icon={StarIcon} size={18} />
            {isCover ? "Okładka" : "Ustaw jako okładkę"}
          </Button>
          <div className="[&_button]:size-11 [&_button]:text-white/80">
            <ConfirmDelete
              title="Usunąć zdjęcie?"
              description="Zdjęcie zostanie trwale usunięte."
              onConfirm={onDelete}
              disabled={deleteState.isLoading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const CarPhotos = ({ car }) => {
  const photosQuery = useGetPhotosQuery(car.id);
  const [uploadPhoto] = useUploadPhotoMutation();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [viewerIndex, setViewerIndex] = useState(null);
  const photos = photosQuery.data ?? [];

  // Files go one by one, so the counter can show progress and one bad file does not stop the rest.
  const onFiles = async (event) => {
    const files = [...event.target.files];
    event.target.value = "";
    setUploadError("");

    for (const [index, file] of files.entries()) {
      setProgress({ done: index, total: files.length });

      try {
        await uploadPhoto({ carId: car.id, file }).unwrap();
      } catch (error) {
        setUploadError(errorText(error, "Nie udało się wysłać zdjęcia."));
      }
    }

    setProgress(null);
  };

  return (
    <section className="reveal grid gap-3" style={{ "--i": 1 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />
      {car.coverUrl ? (
        <div className="group relative overflow-hidden rounded-3xl border" data-glow="">
          <img src={car.coverUrl} alt={`Okładka: ${car.name}`} decoding="async" className="aspect-video w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 lg:aspect-[3/1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-primary/10" />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid aspect-video place-content-center lg:aspect-[3/1] justify-items-center gap-2 rounded-3xl border border-dashed text-muted-foreground transition-colors hover:bg-accent/40"
        >
          <Icon icon={ImageAdd01Icon} size={32} className="text-primary" />
          <span className="text-sm">Dodaj zdjęcie auta</span>
        </button>
      )}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading font-semibold">
          Zdjęcia {photos.length > 0 ? <span className="text-muted-foreground">({photos.length})</span> : null}
        </h2>
        <Button
          type="button"
          variant="outline"
          disabled={progress !== null}
          onClick={() => inputRef.current?.click()}
        >
          <Icon icon={ImageAdd01Icon} size={18} />
          {progress ? `Wysyłanie ${progress.done + 1} z ${progress.total}…` : "Dodaj"}
        </Button>
      </div>
      {uploadError ? (
        <p role="alert" className="text-sm text-destructive">
          {uploadError}
        </p>
      ) : null}
      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {photos.map((photo, index) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setViewerIndex(index)}
                className="group relative block w-full overflow-hidden rounded-xl"
                aria-label={`Zdjęcie ${index + 1}`}
              >
                <img
                  src={photo.thumbUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                />
                {photo.id === car.coverPhotoId ? (
                  <span className="absolute top-1.5 left-1.5 flex size-6 items-center justify-center rounded-full bg-primary-fill text-primary-foreground">
                    <Icon icon={StarIcon} size={14} />
                    <span className="sr-only">Okładka</span>
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <PhotoViewer
        car={car}
        photos={photos}
        open={viewerIndex !== null}
        index={viewerIndex ?? 0}
        onIndexChange={setViewerIndex}
        onClose={() => setViewerIndex(null)}
      />
    </section>
  );
};

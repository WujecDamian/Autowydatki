import { useState } from "react";
import { useOutletContext } from "react-router";
import { PinIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useAddNoteMutation,
  useDeleteNoteMutation,
  useGetNotesQuery,
  useUpdateNoteMutation,
} from "../../app/api.js";
import { errorText, formatRelativeDay } from "../../lib/format.js";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "../../lib/useMediaQuery.js";
import { FormPanel } from "../FormPanel/FormPanel.jsx";
import { AddButton } from "../AddButton/AddButton.jsx";
import { ConfirmDelete } from "../ConfirmDelete/ConfirmDelete.jsx";
import { FormDrawer } from "../FormDrawer/FormDrawer.jsx";
import { Icon } from "../Icon/Icon.jsx";
import { PageHeader } from "../PageHeader/PageHeader.jsx";

const maximumBodyLength = 5000;

// The first line reads as the note's title, the rest as its preview.
const splitNote = (body) => {
  const [title, ...rest] = body.split("\n");
  return { title, preview: rest.join("\n").trim() };
};

const NoteForm = ({ carId, note, onDone, focusNew = true }) => {
  const [body, setBody] = useState(note?.body ?? "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [addNote, addState] = useAddNoteMutation();
  const [updateNote, updateState] = useUpdateNoteMutation();
  const [deleteNote, deleteState] = useDeleteNoteMutation();
  const saveState = note ? updateState : addState;
  const errorMessage = errorText(saveState.error, "Nie udało się zapisać notatki.");

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      if (note) {
        await updateNote({ id: note.id, body, pinned }).unwrap();
      } else {
        await addNote({ carId, body, pinned }).unwrap();
      }

      onDone();
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  const onDelete = async () => {
    try {
      await deleteNote(note.id).unwrap();
      onDone();
    } catch {
      // The note stays open, so deleting can be retried.
    }
  };

  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="note-body">Treść</Label>
        <Textarea
          id="note-body"
          placeholder={"Pierwsza linia to tytuł\nnp. Ciśnienie w oponach: przód 2,3 bar"}
          className="max-h-[45svh] min-h-40 px-3 py-2.5 text-base md:text-base lg:min-h-56"
          maxLength={maximumBodyLength}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          autoFocus={focusNew && !note}
          required
        />
        <p className="text-right text-xs text-muted-foreground">
          {body.length} / {maximumBodyLength}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant={pinned ? "secondary" : "outline"}
          aria-pressed={pinned}
          onClick={() => setPinned((current) => !current)}
          className="aria-pressed:text-primary"
        >
          <Icon icon={PinIcon} size={18} />
          {pinned ? "Przypięta" : "Przypnij"}
        </Button>
        {note ? (
          <ConfirmDelete
            title="Usunąć notatkę?"
            description="Notatka zostanie trwale usunięta."
            onConfirm={onDelete}
            disabled={deleteState.isLoading}
          />
        ) : null}
      </div>
      {errorMessage ? (
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={saveState.isLoading || !body.trim()}>
        {saveState.isLoading ? "Zapisywanie..." : note ? "Zapisz zmiany" : "Dodaj notatkę"}
      </Button>
    </form>
  );
};

export const NotesSection = () => {
  const { car } = useOutletContext();
  const notesQuery = useGetNotesQuery(car.id);
  // null: drawer closed, { note: null }: new note, { note }: editing that note.
  const [editing, setEditing] = useState(null);
  const desktop = useMediaQuery("(min-width: 64rem)");
  const active = editing ?? (desktop ? { note: null } : null);
  const notes = notesQuery.data ?? [];
  const noteForm = active ? (
    <NoteForm
      key={active.note?.id ?? "new"}
      carId={car.id}
      note={active.note}
      focusNew={!desktop}
      onDone={() => setEditing(null)}
    />
  ) : null;

  return (
    <section className="grid gap-4">
      <PageHeader title="Notatki" description="Ważne informacje o aucie w jednym miejscu." />
      {notesQuery.isLoading ? <p className="text-muted-foreground">Wczytywanie notatek...</p> : null}
      {notesQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Nie udało się wczytać notatek.
        </p>
      ) : null}
      {!notesQuery.isLoading && !notesQuery.isError && notes.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Brak notatek. Zapisz np. ciśnienie w oponach, kod radia albo numer do warsztatu.
        </p>
      ) : null}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[26rem_minmax(0,1fr)]">
      <ul className="grid gap-3">
        {notes.map((note) => {
          const { title, preview } = splitNote(note.body);

          return (
            <li key={note.id}>
              <button
                type="button"
                onClick={() => setEditing({ note })}
                data-glow=""
                className={cn(
                  "grid w-full gap-1.5 rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-accent/40",
                  note.pinned && "border-primary/30",
                  desktop && active?.note?.id === note.id && "border-primary/50 bg-primary/10 hover:bg-primary/15",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 font-medium break-words">{title}</p>
                  {note.pinned ? (
                    <span className="shrink-0 text-primary-soft">
                      <Icon icon={PinIcon} size={16} />
                      <span className="sr-only">Przypięta</span>
                    </span>
                  ) : null}
                </div>
                {preview ? (
                  <p className="line-clamp-3 text-sm whitespace-pre-line text-muted-foreground">
                    {preview}
                  </p>
                ) : null}
                <p className="text-xs text-muted-foreground/80">
                  {formatRelativeDay(note.updatedAt)}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
      {desktop && active ? (
        <FormPanel
          title={active.note ? "Edytuj notatkę" : "Nowa notatka"}
          onReset={editing ? () => setEditing(null) : undefined}
        >
          {noteForm}
        </FormPanel>
      ) : null}
      </div>
      <AddButton label="Dodaj notatkę" onClick={() => setEditing({ note: null })} />
      <FormDrawer
        open={editing !== null && !desktop}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
        title={editing?.note ? "Notatka" : "Nowa notatka"}
      >
        {noteForm}
      </FormDrawer>
    </section>
  );
};

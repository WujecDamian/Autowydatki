import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAddStationMutation,
  useDeleteStationMutation,
  useGetStationsQuery,
} from "../../app/api.js";
import { errorText } from "../../lib/format.js";
import { ConfirmDelete } from "../ConfirmDelete/ConfirmDelete.jsx";
import { StationLogo } from "../StationLogo/StationLogo.jsx";

// Radix Select does not allow an empty value, so "no station" and "add new" get sentinels.
const noStation = "none";
const newStation = "new";

const itemClass = "min-h-11 text-sm";

const StationOption = ({ name }) => (
  <span className="flex items-center gap-3">
    <StationLogo name={name} className="size-7 rounded-lg p-1 text-xs" />
    {name}
  </span>
);

export const StationPicker = ({ value, onChange }) => {
  const { data: stations = [] } = useGetStationsQuery();
  const [addStation, addState] = useAddStationMutation();
  const [deleteStation, deleteState] = useDeleteStationMutation();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const builtIn = stations.filter((station) => !station.isCustom);
  const custom = stations.filter((station) => station.isCustom);
  const selected = stations.find((station) => station.id === value);
  const errorMessage = errorText(addState.error, "Nie udało się dodać stacji.");

  const onSelect = (selectedValue) => {
    if (selectedValue === newStation) {
      setAdding(true);
      return;
    }

    setAdding(false);
    onChange(selectedValue === noStation ? null : Number(selectedValue));
  };

  const onAdd = async () => {
    try {
      const station = await addStation(name).unwrap();
      setName("");
      setAdding(false);
      onChange(station.id);
    } catch {
      // The error message is rendered from the mutation result.
    }
  };

  const onDelete = async () => {
    try {
      await deleteStation(value).unwrap();
      onChange(null);
    } catch {
      // The station stays selected; deleting can be retried.
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor="fuel-station">Stacja</Label>
      <div className="flex items-center gap-2">
        <Select value={value === null ? noStation : String(value)} onValueChange={onSelect}>
          <SelectTrigger id="fuel-station" className="h-11 w-full px-3 text-base data-[size=default]:h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-72">
            <SelectItem value={noStation} className={itemClass}>
              Bez stacji
            </SelectItem>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Sieci</SelectLabel>
              {builtIn.map((station) => (
                <SelectItem key={station.id} value={String(station.id)} className={itemClass}>
                  <StationOption name={station.name} />
                </SelectItem>
              ))}
            </SelectGroup>
            {custom.length > 0 ? (
              <SelectGroup>
                <SelectLabel>Twoje stacje</SelectLabel>
                {custom.map((station) => (
                  <SelectItem key={station.id} value={String(station.id)} className={itemClass}>
                    <StationOption name={station.name} />
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            <SelectSeparator />
            <SelectItem value={newStation} className={`${itemClass} text-primary`}>
              + Dodaj własną stację
            </SelectItem>
          </SelectContent>
        </Select>
        {selected?.isCustom ? (
          <ConfirmDelete
            title="Usunąć stację?"
            description={`„${selected.name}” zniknie z listy. Tankowania z tej stacji zostaną, bez nazwy stacji.`}
            onConfirm={onDelete}
            disabled={deleteState.isLoading}
          />
        ) : null}
      </div>
      {adding ? (
        <div className="grid gap-2 rounded-xl border border-dashed p-3">
          <div className="flex gap-2">
            <Input
              aria-label="Nazwa nowej stacji"
              placeholder="np. Stacja u Kowalskiego"
              className="h-11 text-base"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                // Enter would otherwise submit the surrounding fuel form.
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (name.trim()) {
                    onAdd();
                  }
                }
              }}
              autoFocus
            />
            <Button
              type="button"
              size="lg"
              className="h-11"
              onClick={onAdd}
              disabled={!name.trim() || addState.isLoading}
            >
              Dodaj
            </Button>
          </div>
          {errorMessage ? (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

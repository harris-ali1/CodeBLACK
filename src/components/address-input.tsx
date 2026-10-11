// Text input that suggests street addresses as you type (see lib/address-search.ts).
// Typing your own address always works; picking a suggestion also gives us its coordinates.
import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { suggestAddresses, type Place } from "@/lib/address-search";
import { cn } from "@/lib/utils";

interface AddressInputProps {
  id: string;
  value: string;
  onChange: (text: string) => void;
  /** Called with the chosen suggestion */
  onPick: (place: Place) => void;
  placeholder?: string;
  className?: string;
}

export function AddressInput({ id, value, onChange, onPick, placeholder, className }: AddressInputProps) {
  const listId = useId();
  const [places, setPlaces] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const justPicked = useRef(false);

  // Look up suggestions shortly after the user stops typing
  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 4) {
      setPlaces([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      suggestAddresses(q, ctrl.signal)
        .then((p) => {
          setPlaces(p);
          setActive(-1);
          setOpen(p.length > 0);
        })
        .catch(() => {}); // aborted or offline: keep whatever they typed
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [value]);

  const pick = (p: Place) => {
    justPicked.current = true;
    onChange(p.label);
    onPick(p);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % places.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? places.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // pick the suggestion instead of submitting the form
      pick(places[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="street-address"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => places.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={placeholder}
        className={className}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-navy-700 bg-navy-900 py-1 shadow-xl"
        >
          {places.map((p, i) => (
            <li
              key={p.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: the input's blur would close the list before a click lands
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-navy-200",
                i === active && "bg-navy-800 text-white",
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              {p.label}
            </li>
          ))}
          <li className="px-3 pt-1 pb-0.5 text-[11px] text-navy-500" aria-hidden="true">
            Suggestions from OpenStreetMap
          </li>
        </ul>
      )}
    </div>
  );
}

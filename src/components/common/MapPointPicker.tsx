import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X, Minus, Plus, MapPin, LocateFixed } from 'lucide-react';

export interface MapPoint {
  latitude: number;
  longitude: number;
}

interface MapPointPickerProps {
  /** Point shown when the picker opens (the current selection, or an area centre). */
  initialPoint: MapPoint;
  title?: string;
  onCancel: () => void;
  onConfirm: (point: MapPoint) => void;
}

const TILE_SIZE = 256;
const MIN_ZOOM = 5;
const MAX_ZOOM = 19;
// Same OpenStreetMap tiles as the mobile app's map picker.
const TILE_URL = (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

const clampLat = (lat: number) => Math.max(-85, Math.min(85, lat));

function toWorldPixels(point: MapPoint, zoom: number): { x: number; y: number } {
  const scale = TILE_SIZE * 2 ** zoom;
  const latRad = (clampLat(point.latitude) * Math.PI) / 180;
  return {
    x: ((point.longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * scale,
  };
}

function fromWorldPixels(x: number, y: number, zoom: number): MapPoint {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { latitude: clampLat(latitude), longitude: ((((longitude + 180) % 360) + 360) % 360) - 180 };
}

/**
 * Lightweight map picker: the member drags the map under a fixed centre pin
 * and confirms. Closes with the X, Cancel, a click outside, or Escape.
 */
export const MapPointPicker: React.FC<MapPointPickerProps> = ({
  initialPoint,
  title = 'Choose Shop / Work Location',
  onCancel,
  onConfirm,
}) => {
  const [center, setCenter] = useState<MapPoint>(initialPoint);
  const [zoom, setZoom] = useState(15);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState('');
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(null);

  useLayoutEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onCancel]);

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setCenter((current) => {
        const px = toWorldPixels(current, zoom);
        return fromWorldPixels(px.x - dx, px.y - dy, zoom);
      });
    },
    [zoom]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = { pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.lastX;
    const dy = e.clientY - drag.lastY;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    if (dx || dy) panBy(dx, dy);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const handleKeyPan = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = 60;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      panBy(move[0], move[1]);
    } else if (e.key === '+' || e.key === '=') {
      setZoom((z) => Math.min(MAX_ZOOM, z + 1));
    } else if (e.key === '-') {
      setZoom((z) => Math.max(MIN_ZOOM, z - 1));
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocateError('Location access is not available in this browser. Move the map to your location instead.');
      return;
    }
    setLocating(true);
    setLocateError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setZoom((z) => Math.max(z, 16));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setLocateError('Location access was not allowed. Move the map to your location instead.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Visible tiles around the centre.
  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  if (size.width > 0 && size.height > 0) {
    const world = toWorldPixels(center, zoom);
    const originX = world.x - size.width / 2;
    const originY = world.y - size.height / 2;
    const count = 2 ** zoom;
    const startX = Math.floor(originX / TILE_SIZE);
    const endX = Math.floor((originX + size.width) / TILE_SIZE);
    const startY = Math.max(0, Math.floor(originY / TILE_SIZE));
    const endY = Math.min(count - 1, Math.floor((originY + size.height) / TILE_SIZE));
    for (let tx = startX; tx <= endX; tx++) {
      for (let ty = startY; ty <= endY; ty++) {
        const wrappedX = ((tx % count) + count) % count;
        tiles.push({
          key: `${zoom}-${tx}-${ty}`,
          src: TILE_URL(zoom, wrappedX, ty),
          left: Math.round(tx * TILE_SIZE - originX),
          top: Math.round(ty * TILE_SIZE - originY),
        });
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-picker-title"
        className="flex w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="map-picker-title" className="text-base font-bold text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Drag the map so the pin sits exactly on your shop or workplace.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close map"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={mapRef}
          tabIndex={0}
          aria-label="Map. Drag or use the arrow keys to move, plus and minus to zoom."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={handleKeyPan}
          className="relative h-[55vh] max-h-[420px] min-h-[260px] cursor-grab touch-none select-none overflow-hidden bg-slate-200 outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
        >
          {tiles.map((t) => (
            <img
              key={t.key}
              src={t.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute h-64 w-64 max-w-none"
              style={{ left: t.left, top: t.top }}
            />
          ))}

          {/* Fixed centre pin */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
            <MapPin className="h-10 w-10 fill-rose-500 text-white drop-shadow-lg" strokeWidth={1.5} />
          </div>
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-600/70" />

          <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 1))}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              className="p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 1))}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              className="border-t border-slate-200 p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-md hover:bg-slate-50 disabled:opacity-60"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            {locating ? 'Locating…' : 'My location'}
          </button>

          <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600">
            © OpenStreetMap contributors
          </span>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Selected:</span>{' '}
            <span className="font-mono">
              {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
            </span>
            {locateError && <span className="mt-1 block text-rose-600">{locateError}</span>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(center)}
              className="rounded-xl bg-[#75C96B] px-4 py-2 text-xs font-bold text-[#202226] shadow-sm hover:bg-[#65b85b]"
            >
              Use this location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StaticMapPreviewProps {
  point: MapPoint;
  zoom?: number;
  className?: string;
}

/** Read-only map with a pin at `point` (same OpenStreetMap tiles). */
export const StaticMapPreview: React.FC<StaticMapPreviewProps> = ({ point, zoom = 16, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  if (size.width > 0 && size.height > 0) {
    const world = toWorldPixels(point, zoom);
    const originX = world.x - size.width / 2;
    const originY = world.y - size.height / 2;
    const count = 2 ** zoom;
    for (let tx = Math.floor(originX / TILE_SIZE); tx <= Math.floor((originX + size.width) / TILE_SIZE); tx++) {
      for (
        let ty = Math.max(0, Math.floor(originY / TILE_SIZE));
        ty <= Math.min(count - 1, Math.floor((originY + size.height) / TILE_SIZE));
        ty++
      ) {
        tiles.push({
          key: `${tx}-${ty}`,
          src: TILE_URL(zoom, ((tx % count) + count) % count, ty),
          left: Math.round(tx * TILE_SIZE - originX),
          top: Math.round(ty * TILE_SIZE - originY),
        });
      }
    }
  }

  return (
    <div ref={ref} className={`relative overflow-hidden bg-slate-200 ${className}`} aria-hidden="true">
      {tiles.map((t) => (
        <img
          key={t.key}
          src={t.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute h-64 w-64 max-w-none"
          style={{ left: t.left, top: t.top }}
        />
      ))}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <MapPin className="h-8 w-8 fill-rose-500 text-white drop-shadow-lg" strokeWidth={1.5} />
      </div>
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-600">
        © OpenStreetMap contributors
      </span>
    </div>
  );
};

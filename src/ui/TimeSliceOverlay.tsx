import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ValueLogDraft } from "@/game/iov/ValueLogModel";

const TIME_SLICE_SNAP_MINUTES = 5;
const TIME_SLICE_MIN_DURATION_MINUTES = 5;

const clampNumber = (min: number, max: number, value: number) =>
  Math.min(max, Math.max(min, value));

const parseLocalDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);

const minutesFromDate = (date: Date) => date.getHours() * 60 + date.getMinutes();

const minutesToDate = (day: Date, minutes: number) => {
  const next = new Date(day);
  next.setMinutes(minutes, 0, 0);
  return next;
};

const snapTimeSliceMinutes = (minutes: number) =>
  clampNumber(0, 1435, Math.round(minutes / TIME_SLICE_SNAP_MINUTES) * TIME_SLICE_SNAP_MINUTES);

const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export const formatShortClock = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

export const formatShortDate = (input: string) => {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

interface TimeSliceOverlayProps {
  draft: ValueLogDraft;
  phase: "start" | "end";
  canContinue: boolean;
  onDraftChange: (patch: Partial<ValueLogDraft>) => void;
  onPrimaryAction: () => void;
  onAdjustBegin: () => void;
  onBack: () => void;
}

const TimeSliceOverlay = ({
  draft,
  phase,
  canContinue,
  onDraftChange,
  onPrimaryAction,
  onAdjustBegin,
  onBack,
}: TimeSliceOverlayProps) => {
  const [dragMode, setDragMode] = useState<"start" | "end" | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nowDate = parseLocalDate(draft.endTime) ?? new Date();
  const dayStart = startOfLocalDay(nowDate);
  const nowMinutes = clampNumber(0, 1435, minutesFromDate(nowDate));
  const parsedStart = parseLocalDate(draft.startTime) ?? nowDate;
  const parsedEnd = parseLocalDate(draft.endTime) ?? nowDate;
  const startMinutes = clampNumber(
    0,
    Math.max(0, nowMinutes - TIME_SLICE_MIN_DURATION_MINUTES),
    minutesFromDate(parsedStart)
  );
  const endMinutes = clampNumber(
    startMinutes + TIME_SLICE_MIN_DURATION_MINUTES,
    nowMinutes,
    minutesFromDate(parsedEnd)
  );

  const center = 160;
  const radius = 112;
  const handleRadius = 10;
  const activeMode = dragMode ?? (phase === "start" ? "start" : "end");
  const selectedMinutes = activeMode === "start" ? startMinutes : endMinutes;
  const durationMinutes = Math.max(0, endMinutes - startMinutes);
  const durationLabel =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${String(durationMinutes % 60).padStart(2, "0")}m`
      : `${durationMinutes}m`;

  const pointForMinutes = (minutes: number, pointRadius = radius) => {
    const angle = (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * pointRadius,
      y: center + Math.sin(angle) * pointRadius,
    };
  };

  const startPoint = pointForMinutes(startMinutes);
  const endPoint = pointForMinutes(endMinutes);
  const nowPoint = pointForMinutes(nowMinutes);
  const readoutPoint = pointForMinutes(selectedMinutes, radius + 26);
  const startArc = pointForMinutes(startMinutes, radius - 18);
  const endArc = pointForMinutes(endMinutes, radius - 18);
  const arcDelta = Math.max(0, endMinutes - startMinutes);
  const largeArc = arcDelta > 720 ? 1 : 0;
  const arcPath =
    arcDelta > 0
      ? `M ${center} ${center} L ${startArc.x} ${startArc.y} A ${radius - 18} ${radius - 18} 0 ${largeArc} 1 ${endArc.x} ${endArc.y} Z`
      : "";

  const getMinutesFromPointer = (event: ReactPointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const scaleX = 320 / Math.max(1, rect.width);
    const scaleY = 320 / Math.max(1, rect.height);
    const localX = x * scaleX - center;
    const localY = y * scaleY - center;
    const angle = Math.atan2(localY, localX);
    const normalized = ((angle + Math.PI / 2) / (Math.PI * 2) + 1) % 1;
    return snapTimeSliceMinutes(normalized * 1440);
  };

  const updateFromPointer = (event: ReactPointerEvent<SVGElement>, mode: "start" | "end") => {
    const rawMinutes = getMinutesFromPointer(event);
    if (mode === "start") {
      const nextStart = clampNumber(
        0,
        Math.max(0, nowMinutes - TIME_SLICE_MIN_DURATION_MINUTES),
        rawMinutes
      );
      onDraftChange({
        startTime: toLocalInputValue(minutesToDate(dayStart, nextStart)),
        endTime: toLocalInputValue(minutesToDate(dayStart, nowMinutes)),
      });
      return;
    }

    const minEnd = Math.min(nowMinutes, startMinutes + TIME_SLICE_MIN_DURATION_MINUTES);
    const nextEnd = clampNumber(minEnd, nowMinutes, rawMinutes);
    onDraftChange({
      startTime: toLocalInputValue(minutesToDate(dayStart, startMinutes)),
      endTime: toLocalInputValue(minutesToDate(dayStart, nextEnd)),
    });
  };

  const beginDrag = (event: ReactPointerEvent<SVGElement>, requestedMode?: "start" | "end") => {
    const nextMode = requestedMode ?? (phase === "start" ? "start" : "end");
    setDragMode(nextMode);
    svgRef.current?.setPointerCapture(event.pointerId);
    updateFromPointer(event, nextMode);
  };

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragMode) return;
    updateFromPointer(event, dragMode);
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (svg?.hasPointerCapture(event.pointerId)) {
      svg.releasePointerCapture(event.pointerId);
    }
    setDragMode(null);
  };

  return (
    <div className="iov-time-slice-overlay">
      <div className="iov-time-slice-card">
        <div className="iov-time-slice-header">
          <div>
            <div className="iov-time-slice-kicker">Time Slice</div>
            <h2>{phase === "start" ? "Choose when it began" : "Choose when it ended"}</h2>
          </div>
          <button type="button" className="iov-time-slice-back" onClick={onBack}>
            Back
          </button>
        </div>

        <div className="iov-time-slice-readout" aria-live="polite">
          <strong>
            {formatShortClock(draft.startTime)} {"->"} {formatShortClock(draft.endTime)}
          </strong>
          <span>
            {formatShortDate(draft.endTime)} · {durationLabel}
          </span>
        </div>

        <svg
          ref={svgRef}
          className="iov-time-slice-dial"
          viewBox="0 0 320 320"
          role="slider"
          aria-label="Time slice selector"
          onPointerDown={(event) => beginDrag(event)}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <circle className="iov-time-slice-face" cx={center} cy={center} r={radius + 18} />
          <circle className="iov-time-slice-rim" cx={center} cy={center} r={radius} />
          <line className="iov-time-slice-cardinal" x1={center} y1={center - radius - 6} x2={center} y2={center - radius + 16} />
          <line className="iov-time-slice-cardinal" x1={center + radius - 16} y1={center} x2={center + radius + 6} y2={center} />
          <line className="iov-time-slice-cardinal" x1={center} y1={center + radius - 16} x2={center} y2={center + radius + 6} />
          <line className="iov-time-slice-cardinal" x1={center - radius - 6} y1={center} x2={center - radius + 16} y2={center} />
          {arcPath && <path className="iov-time-slice-range" d={arcPath} />}
          <line className="iov-time-slice-hand is-now" x1={center} y1={center} x2={nowPoint.x} y2={nowPoint.y} />
          <line
            className={`iov-time-slice-hand ${activeMode === "start" ? "is-active" : "is-muted"}`}
            x1={center}
            y1={center}
            x2={startPoint.x}
            y2={startPoint.y}
          />
          <line
            className={`iov-time-slice-hand ${phase === "end" && activeMode === "end" ? "is-active" : "is-muted"}`}
            x1={center}
            y1={center}
            x2={endPoint.x}
            y2={endPoint.y}
          />
          <circle
            className={`iov-time-slice-handle ${activeMode === "start" ? "is-active" : ""}`}
            cx={startPoint.x}
            cy={startPoint.y}
            r={handleRadius}
            onPointerDown={(event) => {
              event.stopPropagation();
              beginDrag(event, "start");
            }}
          />
          {phase === "end" && (
            <circle
              className={`iov-time-slice-handle ${activeMode === "end" ? "is-active" : ""}`}
              cx={endPoint.x}
              cy={endPoint.y}
              r={handleRadius}
              onPointerDown={(event) => {
                event.stopPropagation();
                beginDrag(event, "end");
              }}
            />
          )}
          <circle className="iov-time-slice-center" cx={center} cy={center} r={6} />
          <text className="iov-time-slice-now-label" x={center} y={center - 18}>
            {formatShortDate(draft.endTime)} · Now {formatShortClock(draft.endTime)}
          </text>
          <text
            className="iov-time-slice-active-label"
            x={clampNumber(62, 258, readoutPoint.x)}
            y={clampNumber(32, 288, readoutPoint.y)}
          >
            {activeMode === "start" ? "Begin" : "End"}{" "}
            {formatShortClock(activeMode === "start" ? draft.startTime : draft.endTime)}
          </text>
        </svg>

        <div className="iov-time-slice-actions">
          {phase === "end" && (
            <button type="button" className="iov-btn-secondary iov-btn-inline" onClick={onAdjustBegin}>
              Adjust Begin
            </button>
          )}
          <button
            type="button"
            className="iov-btn-primary iov-btn-inline"
            onClick={onPrimaryAction}
            disabled={!canContinue}
          >
            {phase === "start" ? "Lock Begin" : "Lock End"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeSliceOverlay;

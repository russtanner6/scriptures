/**
 * Chart.js plugin: renders a horizontal scrollbar below the chart when zoomed in.
 * Works with chartjs-plugin-zoom. The scrollbar is draggable for panning.
 */

const SCROLLBAR_HEIGHT = 6;
const SCROLLBAR_MARGIN = 8;
const SCROLLBAR_RADIUS = 3;
const TRACK_COLOR = "rgba(255,255,255,0.08)";
const THUMB_COLOR = "rgba(255,255,255,0.25)";
const THUMB_HOVER_COLOR = "rgba(255,255,255,0.4)";

interface ScrollbarState {
  isDragging: boolean;
  dragStartX: number;
  dragStartPan: number;
  isHovering: boolean;
  thumbRect: { x: number; y: number; w: number; h: number } | null;
  trackRect: { x: number; y: number; w: number; h: number } | null;
  attached: boolean;
}

function getState(chart: any): ScrollbarState {
  if (!chart._scrollbarState) {
    chart._scrollbarState = {
      isDragging: false,
      dragStartX: 0,
      dragStartPan: 0,
      isHovering: false,
      thumbRect: null,
      trackRect: null,
      attached: false,
    };
  }
  return chart._scrollbarState;
}

function getZoomLevel(chart: any): { min: number; max: number; dataMin: number; dataMax: number } | null {
  const scale = chart.scales?.x;
  if (!scale) return null;
  const dataMin = 0;
  const dataMax = (chart.data?.labels?.length ?? 1) - 1;
  const visMin = scale.min;
  const visMax = scale.max;
  if (visMin <= dataMin && visMax >= dataMax) return null; // not zoomed
  return { min: visMin, max: visMax, dataMin, dataMax };
}

function attachEvents(chart: any) {
  const state = getState(chart);
  if (state.attached) return;
  state.attached = true;

  const canvas = chart.canvas as HTMLCanvasElement;

  const onMouseMove = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = getState(chart);

    if (s.isDragging && s.trackRect) {
      const zoom = getZoomLevel(chart);
      if (!zoom) return;
      const range = zoom.dataMax - zoom.dataMin;
      const visRange = zoom.max - zoom.min;
      const trackW = s.trackRect.w;
      const dx = x - s.dragStartX;
      const dataDx = (dx / trackW) * range;
      let newMin = s.dragStartPan + dataDx;
      newMin = Math.max(zoom.dataMin, Math.min(newMin, zoom.dataMax - visRange));
      const newMax = newMin + visRange;
      chart.scales.x.options.min = newMin;
      chart.scales.x.options.max = newMax;
      chart.update("none");
      return;
    }

    // Hover detection
    if (s.thumbRect) {
      const inThumb = x >= s.thumbRect.x && x <= s.thumbRect.x + s.thumbRect.w &&
                      y >= s.thumbRect.y && y <= s.thumbRect.y + s.thumbRect.h;
      if (inThumb !== s.isHovering) {
        s.isHovering = inThumb;
        canvas.style.cursor = inThumb ? "grab" : "";
        chart.draw();
      }
    }
  };

  const onMouseDown = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = getState(chart);
    if (s.thumbRect && x >= s.thumbRect.x && x <= s.thumbRect.x + s.thumbRect.w &&
        y >= s.thumbRect.y && y <= s.thumbRect.y + s.thumbRect.h) {
      s.isDragging = true;
      s.dragStartX = x;
      const zoom = getZoomLevel(chart);
      s.dragStartPan = zoom ? zoom.min : 0;
      canvas.style.cursor = "grabbing";
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onMouseUp = () => {
    const s = getState(chart);
    if (s.isDragging) {
      s.isDragging = false;
      canvas.style.cursor = s.isHovering ? "grab" : "";
    }
  };

  // Touch events for mobile
  const onTouchStart = (e: TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const s = getState(chart);
    if (s.thumbRect && x >= s.thumbRect.x - 10 && x <= s.thumbRect.x + s.thumbRect.w + 10 &&
        y >= s.thumbRect.y - 10 && y <= s.thumbRect.y + s.thumbRect.h + 10) {
      s.isDragging = true;
      s.dragStartX = x;
      const zoom = getZoomLevel(chart);
      s.dragStartPan = zoom ? zoom.min : 0;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    const s = getState(chart);
    if (!s.isDragging || !s.trackRect) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const zoom = getZoomLevel(chart);
    if (!zoom) return;
    const range = zoom.dataMax - zoom.dataMin;
    const visRange = zoom.max - zoom.min;
    const trackW = s.trackRect.w;
    const dx = x - s.dragStartX;
    const dataDx = (dx / trackW) * range;
    let newMin = s.dragStartPan + dataDx;
    newMin = Math.max(zoom.dataMin, Math.min(newMin, zoom.dataMax - visRange));
    const newMax = newMin + visRange;
    chart.scales.x.options.min = newMin;
    chart.scales.x.options.max = newMax;
    chart.update("none");
    e.preventDefault();
  };

  const onTouchEnd = () => {
    const s = getState(chart);
    s.isDragging = false;
  };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);

  // Store cleanup references
  chart._scrollbarCleanup = () => {
    canvas.removeEventListener("mousemove", onMouseMove);
    canvas.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
  };
}

export const chartScrollbarPlugin = {
  id: "chartScrollbar",

  afterDraw(chart: any) {
    const zoom = getZoomLevel(chart);
    if (!zoom) {
      // Not zoomed — clear state
      const s = getState(chart);
      s.thumbRect = null;
      s.trackRect = null;
      return;
    }

    attachEvents(chart);
    const state = getState(chart);
    const { ctx, chartArea } = chart;
    const { left, right, bottom } = chartArea;

    const trackY = bottom + SCROLLBAR_MARGIN;
    const trackW = right - left;
    const range = zoom.dataMax - zoom.dataMin;
    const visRange = zoom.max - zoom.min;
    const thumbW = Math.max(20, (visRange / range) * trackW);
    const thumbX = left + ((zoom.min - zoom.dataMin) / range) * trackW;

    state.trackRect = { x: left, y: trackY, w: trackW, h: SCROLLBAR_HEIGHT };
    state.thumbRect = { x: thumbX, y: trackY, w: thumbW, h: SCROLLBAR_HEIGHT };

    // Draw track
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left, trackY, trackW, SCROLLBAR_HEIGHT, SCROLLBAR_RADIUS);
    ctx.fillStyle = TRACK_COLOR;
    ctx.fill();

    // Draw thumb
    ctx.beginPath();
    ctx.roundRect(thumbX, trackY, thumbW, SCROLLBAR_HEIGHT, SCROLLBAR_RADIUS);
    ctx.fillStyle = state.isHovering || state.isDragging ? THUMB_HOVER_COLOR : THUMB_COLOR;
    ctx.fill();
    ctx.restore();
  },

  beforeDestroy(chart: any) {
    if (chart._scrollbarCleanup) {
      chart._scrollbarCleanup();
    }
  },
};

import { useEffect, useRef } from "react";

interface Props {
  values: number[];
  color: string;
  height?: number;
}

/** Draws 0..1 samples as a filled line. Renders nothing when there is no data. */
export function Sparkline({ values, color, height = 28 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || values.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    canvas.width = w * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, height);

    const step = w / (values.length - 1);
    const y = (v: number) => height - 2 - Math.min(1, Math.max(0, v)) * (height - 4);

    ctx.beginPath();
    values.forEach((v, i) => (i ? ctx.lineTo(i * step, y(v)) : ctx.moveTo(0, y(v))));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.lineTo(w, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.fill();
  }, [values, color, height]);

  if (values.length < 2) return null;
  return <canvas ref={ref} className="sparkline" style={{ height }} aria-hidden="true" />;
}

/**
 * Lightweight Zero-Dependency Canvas Confetti
 * Designed for mobile web & desktop with zero performance impact
 */

export function fireConfetti(options?: { count?: number; spread?: number }) {
  const count = options?.count ?? 60;
  const spread = options?.spread ?? 70;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    if (document.body.contains(canvas)) document.body.removeChild(canvas);
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const colors = ['#E31837', '#005EB8', '#FFB800', '#10B981', '#38BDF8', '#F97316', '#EC4899'];
  const particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    size: number;
    alpha: number;
    rotation: number;
    rotationSpeed: number;
  }[] = [];

  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.45;

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * spread - spread / 2 - 90) * (Math.PI / 180);
    const speed = Math.random() * 9 + 4;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 7 + 4,
      alpha: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();

  function render() {
    const elapsed = Date.now() - startTime;
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    let activeCount = 0;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.28; // gravity
      p.vx *= 0.98; // friction
      p.rotation += p.rotationSpeed;
      p.alpha = Math.max(0, 1 - elapsed / 2200);

      if (p.alpha > 0) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
    });

    if (activeCount > 0 && elapsed < 2500) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  }

  animationFrameId = requestAnimationFrame(render);
}

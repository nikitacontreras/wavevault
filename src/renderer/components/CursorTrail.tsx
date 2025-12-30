import React, { useEffect, useRef } from 'react';

interface Point {
    x: number;
    y: number;
    age: number;
}

export const CursorTrail: React.FC<{ isDragging: boolean }> = ({ isDragging }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointsRef = useRef<Point[]>([]);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const isDraggingRef = useRef(isDragging);

    useEffect(() => {
        isDraggingRef.current = isDragging;
    }, [isDragging]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            // Strict check: if button is not pressed, don't trail
            // Even if the prop is still true (waiting for mouseup/mouseenter)
            if (e.buttons !== 1) return;

            const x = e.clientX;
            const y = e.clientY;

            const dist = Math.hypot(x - lastPosRef.current.x, y - lastPosRef.current.y);

            if (dist > 2) {
                lastPosRef.current = { x, y };
                pointsRef.current.push({ x, y, age: 0 });
                if (pointsRef.current.length > 50) {
                    pointsRef.current.shift();
                }
            }
        };

        // We use window level events to catch movement even during native drag start
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('drag', handleMouseMove as any, { passive: true });
        window.addEventListener('dragover', handleMouseMove as any, { passive: true });

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('drag', handleMouseMove as any);
            window.removeEventListener('dragover', handleMouseMove as any);
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrame: number;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Advance age
            pointsRef.current.forEach(p => p.age++);
            pointsRef.current = pointsRef.current.filter(p => p.age < 20);

            if (pointsRef.current.length > 1) {
                ctx.beginPath();
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                for (let i = 1; i < pointsRef.current.length; i++) {
                    const p1 = pointsRef.current[i - 1];
                    const p2 = pointsRef.current[i];

                    const opacity = 1 - p2.age / 20;
                    const size = Math.max(1, 12 * (i / pointsRef.current.length) * opacity);

                    ctx.beginPath();
                    ctx.moveTo(p1.x, p1.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${opacity * 0.5})`;
                    ctx.lineWidth = size;
                    ctx.stroke();

                    // Add a glow
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
                }
            }

            animationFrame = requestAnimationFrame(render);
        };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrame);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[10000]"
            style={{ width: '100%', height: '100%' }}
        />
    );
};

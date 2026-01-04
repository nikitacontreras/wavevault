import React, { useState, useEffect, useRef, ReactNode } from 'react';

interface VirtualizedItemProps {
    children: ReactNode;
    id: string;
    minHeight?: string | number;
    className?: string;
    rootMargin?: string;
}

/**
 * VirtualizedItem
 * Desmonta completamente el contenido cuando no está en el viewport (o cerca).
 * Mantiene el espacio en la grid para no romper el scroll.
 */
export const VirtualizedItem: React.FC<VirtualizedItemProps> = ({
    children,
    id,
    minHeight = '320px',
    className = '',
    rootMargin = '400px' // Cargamos 400px antes de que entre en vista
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // Actualizamos visibilidad
                setIsVisible(entry.isIntersecting);
            },
            {
                rootMargin, // Margen de carga anticipada
                threshold: 0.01
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, [rootMargin]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                minHeight: isVisible ? 'auto' : minHeight,
                display: 'flex',
                flexDirection: 'column'
            }}
            data-id={id}
        >
            {isVisible ? children : (
                <div
                    className="w-full h-full rounded-2xl bg-zinc-900/10 border border-white/[0.03] animate-pulse flex items-center justify-center"
                    style={{ minHeight }}
                >
                    <div className="w-10 h-1 h-zinc-800 rounded-full" />
                </div>
            )}
        </div>
    );
};

// ============================================================================
// UI: PopoverPortal Component
// Renderiza un popover anclado a un elemento mediante ReactDOM.createPortal
// para evitar que se recorte por contenedores con overflow: hidden/auto.
// ============================================================================

DiscourseGraphToolkit.PopoverPortal = function ({
    isOpen,
    onClose,
    anchorRef,
    className = '',
    children
}) {
    const React = window.React;
    const ReactDOM = window.ReactDOM || ReactDOM;

    const popoverRef = React.useRef(null);
    const [coords, setCoords] = React.useState({ top: 0, right: 0, bottom: 'auto' });

    // Actualizar coordenadas relativas al viewport
    const updatePosition = React.useCallback(() => {
        if (!anchorRef || !anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return;

        const margin = 6;
        const padding = 12;
        const estimatedHeight = 320;
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Calcular si cabe abajo o si conviene mostrarlo arriba
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const showAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

        let newCoords = {};
        if (showAbove) {
            newCoords.top = 'auto';
            newCoords.bottom = `${Math.max(padding, viewportHeight - rect.top + margin)}px`;
        } else {
            newCoords.top = `${Math.max(padding, rect.bottom + margin)}px`;
            newCoords.bottom = 'auto';
        }

        // Alinear al borde derecho del anchor, garantizando margen mínimo de la pantalla
        const rightOffset = Math.max(padding, viewportWidth - rect.right);
        newCoords.right = `${rightOffset}px`;

        setCoords(newCoords);
    }, [anchorRef]);

    // Posicionamiento inicial y listeners de scroll/resize
    React.useLayoutEffect(() => {
        if (!isOpen) return;

        updatePosition();

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);

        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    // Click outside y tecla Escape para cerrar
    React.useEffect(() => {
        if (!isOpen) return;

        const handleMouseDown = (e) => {
            const isClickInsidePopover = popoverRef.current && popoverRef.current.contains(e.target);
            const isClickInsideAnchor = anchorRef && anchorRef.current && anchorRef.current.contains(e.target);

            if (!isClickInsidePopover && !isClickInsideAnchor) {
                if (typeof onClose === 'function') {
                    onClose();
                }
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (typeof onClose === 'function') {
                    onClose();
                }
            }
        };

        document.addEventListener('mousedown', handleMouseDown, true);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleMouseDown, true);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose, anchorRef]);

    if (!isOpen || !ReactDOM || !ReactDOM.createPortal) {
        return null;
    }

    return ReactDOM.createPortal(
        React.createElement('div', {
            ref: popoverRef,
            className: `dgt-popover dgt-popover-portal ${className}`.trim(),
            style: {
                top: coords.top,
                bottom: coords.bottom,
                right: coords.right
            }
        }, children),
        document.body
    );
};

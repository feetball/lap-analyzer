'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizableContainerProps {
  children: ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeDirection?: 'horizontal' | 'vertical' | 'both';
  className?: string;
  fullWidth?: boolean; // New prop to use 100% width
  onResize?: (width: number, height: number) => void;
}

export default function ResizableContainer({
  children,
  defaultWidth = 400,
  defaultHeight = 300,
  minWidth = 200,
  minHeight = 150,
  maxWidth,
  maxHeight,
  resizeDirection = 'both',
  className = '',
  fullWidth = false,
  onResize,
}: ResizableContainerProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [height, setHeight] = useState(defaultHeight);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (direction: 'width' | 'height' | 'both') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = width;
    const startHeight = height;

    const handleMouseMove = (e: MouseEvent) => {
      if (direction === 'width' || direction === 'both') {
        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth || Infinity, startWidth + (e.clientX - startX))
        );
        setWidth(newWidth);
      }

      if (direction === 'height' || direction === 'both') {
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight || Infinity, startHeight + (e.clientY - startY))
        );
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (onResize) {
        onResize(width, height);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    if (onResize && !isResizing) {
      onResize(width, height);
    }
  }, [width, height, onResize, isResizing]);

  const containerStyle = {
    width: fullWidth || resizeDirection === 'vertical' ? '100%' : `${width}px`,
    height: resizeDirection === 'horizontal' ? 'auto' : `${height}px`,
    minWidth: fullWidth ? 'auto' : `${minWidth}px`,
    minHeight: `${minHeight}px`,
    maxWidth: fullWidth ? '100%' : (maxWidth ? `${maxWidth}px` : undefined),
    maxHeight: maxHeight ? `${maxHeight}px` : undefined,
    position: 'relative' as const,
  };

  return (
    <div
      ref={containerRef}
      className={`${className} ${isResizing ? 'select-none' : ''}`}
      style={containerStyle}
    >
      {children}
      
      {/* Resize Handles */}
      {!fullWidth && (resizeDirection === 'horizontal' || resizeDirection === 'both') && (
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-blue-500/20 transition-colors group z-[9999]"
          onMouseDown={handleMouseDown('width')}
          style={{ right: '-1px' }}
        >
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gray-400 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      
      {(resizeDirection === 'vertical' || resizeDirection === 'both') && (
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-blue-500/20 transition-colors group z-[9999]"
          onMouseDown={handleMouseDown('height')}
          style={{ bottom: '-1px' }}
        >
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-gray-400 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      
      {!fullWidth && resizeDirection === 'both' && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nw-resize hover:bg-blue-500/20 transition-colors group z-[9999]"
          onMouseDown={handleMouseDown('both')}
          style={{ bottom: '-1px', right: '-1px' }}
        >
          <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-gray-400 opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
      
      {/* Visual feedback during resize */}
      {isResizing && (
        <div className="absolute top-2 left-2 bg-black/80 text-white px-2 py-1 rounded text-xs z-50">
          {resizeDirection !== 'vertical' && `W: ${width}px`}
          {resizeDirection === 'both' && ' × '}
          {resizeDirection !== 'horizontal' && `H: ${height}px`}
        </div>
      )}
    </div>
  );
}

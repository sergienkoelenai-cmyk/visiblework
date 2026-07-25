import React, { useState, useRef, useCallback } from 'react';
import './PullToRefresh.css';

const THRESHOLD = 70; // pixels to pull before triggering refresh
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (refreshing) return;
    // Only start pull if scrolled to top
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!pulling.current || refreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      // Pulling down — apply resistance
      const distance = Math.min(diff * 0.5, MAX_PULL);
      setPullDistance(distance);
    } else {
      // Scrolling up — cancel pull
      pulling.current = false;
      setPullDistance(0);
    }
  }, [refreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshing) return;
    pulling.current = false;

    if (pullDistance >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      setPullDistance(THRESHOLD); // snap to threshold position
      try {
        await onRefresh();
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, onRefresh, refreshing]);

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const showIndicator = pullDistance > 10 || refreshing;

  return (
    <div
      ref={containerRef}
      className="ptr-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="ptr-indicator"
        style={{
          height: showIndicator ? `${Math.max(pullDistance, refreshing ? THRESHOLD : 0)}px` : '0px',
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div className={`ptr-spinner ${refreshing ? 'ptr-spinner--active' : ''}`}>
          {refreshing ? (
            <span className="ptr-icon ptr-icon--spinning">↻</span>
          ) : (
            <span
              className="ptr-icon"
              style={{
                transform: `rotate(${progress * 360}deg)`,
                opacity: progress,
              }}
            >
              ↓
            </span>
          )}
          <span className="ptr-text">
            {refreshing ? 'Refreshing…' : progress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Page content */}
      <div
        className="ptr-content"
        style={{
          transform: pullDistance > 0 && !refreshing ? `translateY(0)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

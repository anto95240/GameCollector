import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useVirtualGridDimensions
 *
 * Observes a container element and returns the current width/height
 * to pass into react-window's FixedSizeGrid.
 * Also computes colCount based on container width breakpoints.
 *
 * @param {number} itemMinWidth  - minimum card width before column count drops
 * @returns {{ ref, width, height, colCount }}
 */
const useVirtualGridDimensions = (itemMinWidth = 200) => {
  const ref = useRef(null);
  const [dims, setDims] = useState({ width: 800, height: 580 });

  const measure = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDims({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);

  // Responsive column count
  const colCount = Math.max(1, Math.floor(dims.width / itemMinWidth));

  return { ref, width: dims.width, height: dims.height, colCount };
};

export default useVirtualGridDimensions;

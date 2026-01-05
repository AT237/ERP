import * as React from "react"

export type ScreenSize = 'phone' | 'tablet-compact' | 'tablet-wide' | 'desktop';

const BREAKPOINTS = {
  phone: 640,
  tabletCompact: 1024,
  tabletWide: 1280,
};

function getScreenSize(width: number): ScreenSize {
  if (width < BREAKPOINTS.phone) return 'phone';
  if (width < BREAKPOINTS.tabletCompact) return 'tablet-compact';
  if (width < BREAKPOINTS.tabletWide) return 'tablet-wide';
  return 'desktop';
}

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = React.useState<ScreenSize>(() => {
    if (typeof window !== 'undefined') {
      return getScreenSize(window.innerWidth);
    }
    return 'desktop';
  });

  React.useEffect(() => {
    const checkSize = () => {
      setScreenSize(getScreenSize(window.innerWidth));
    };
    
    checkSize();
    
    window.addEventListener("resize", checkSize);
    window.addEventListener("orientationchange", checkSize);
    
    return () => {
      window.removeEventListener("resize", checkSize);
      window.removeEventListener("orientationchange", checkSize);
    };
  }, []);

  return screenSize;
}

export function useIsMobile(): boolean {
  const screenSize = useScreenSize();
  return screenSize === 'phone' || screenSize === 'tablet-compact';
}

export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = React.useState(false);
  
  React.useEffect(() => {
    const checkTouch = window.matchMedia('(pointer: coarse)').matches;
    setIsTouch(checkTouch);
  }, []);
  
  return isTouch;
}

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState
} from "react";
import "./styles.css";

type Breakpoints = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

type BreakpointOrder = Breakpoints;

type BreakpointContextType = {
  breakpoints: Breakpoints;
  breakpointOrder: BreakpointOrder;
  currentBreakpoint: keyof Breakpoints;
  orderedBreakpoints: (keyof Breakpoints)[];
};

const BreakpointsContext = createContext<BreakpointContextType>(
  {} as BreakpointContextType
);

const useBreakpoints = () => useContext(BreakpointsContext);

const getBreakpointsOrder = <T extends string[]>(
  orderedBreakpoints: T
): Record<T[number], number> => {
  const breakpointsOrder = Object.fromEntries(
    orderedBreakpoints.map((breakpoint, order) => [breakpoint, order] as const)
  );

  return breakpointsOrder as Record<T[number], number>;
};

const getOrderedBreakpoints = <T extends Record<string, number>>(
  breakpoints: T
): (keyof T)[] => {
  return Object.entries(breakpoints)
    .sort(([bpA, bpAValue], [bpB, bpBValue]) => {
      return bpAValue - bpBValue;
    })
    .map(([bp], order) => {
      return bp;
    });
};

type BreakpointsProviderProps = {
  breakpoints: Breakpoints;
  children?: ReactNode;
};

const BreakpointProvider = ({
  breakpoints,
  children
}: BreakpointsProviderProps) => {
  const orderedBreakpoints = getOrderedBreakpoints(breakpoints);
  const breakpointOrder = getBreakpointsOrder(orderedBreakpoints);

  const [currentBreakpoint, setCurrentBreakpoint] = useState(
    orderedBreakpoints[orderedBreakpoints.length - 1]
  );

  useEffect(() => {
    let matchersCleanerupFns: (() => void)[] = [];

    orderedBreakpoints.forEach((breakpoint, i) => {
      let matchPattern: string;

      if (i === 0) {
        matchPattern = `(max-width: ${breakpoints[breakpoint]}px)`;
      } else if (i === orderedBreakpoints.length - 1) {
        matchPattern = `(min-width: ${breakpoints[breakpoint] + 1}px)`;
      } else {
        matchPattern = `(min-width: ${
          breakpoints[orderedBreakpoints[i - 1]] + 1
        }px) and (max-width: ${breakpoints[breakpoint]}px)`;
      }

      const match = window.matchMedia(matchPattern);

      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          setCurrentBreakpoint(breakpoint);
        }
      };

      match.addEventListener("change", handleChange);

      matchersCleanerupFns.push(() => {
        match.removeEventListener("change", handleChange);
      });
    });

    return () => {
      matchersCleanerupFns.forEach((cleanup) => cleanup());
    };
  }, [orderedBreakpoints, breakpoints]);

  const value: BreakpointContextType = {
    breakpoints,
    breakpointOrder,
    currentBreakpoint,
    orderedBreakpoints
  };

  return (
    <BreakpointsContext.Provider value={value}>
      {children}
    </BreakpointsContext.Provider>
  );
};

const breakpoints: Breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920
};

type ResponsiveProp<V extends unknown> = {
  default: V;
} & Partial<
  {
    [K in keyof Breakpoints]: V;
  }
>;

const isObject = <T extends unknown>(value: T): value is Record<any, any> => {
  const type = typeof value;
  return value !== null && (type === "object" || type === "function");
};

const isResponsiveValue = <V extends unknown>(
  value: V | ResponsiveProp<V>
): value is ResponsiveProp<V> => {
  if (isObject(value) && "default" in value) {
    return true;
  }
  return false;
};

const useResponsiveValue = <V extends unknown>(
  responsiveValue: ResponsiveProp<V> | V
) => {
  const {
    currentBreakpoint,
    orderedBreakpoints,
    breakpointOrder
  } = useBreakpoints();

  if (!isResponsiveValue(responsiveValue)) {
    return responsiveValue;
  }

  const { default: defaultValue, ...restValues } = responsiveValue;

  let resolvedValue: V = defaultValue;

  const currentOrder = breakpointOrder[currentBreakpoint];
  let i = currentOrder;
  while (i >= 0) {
    const bp = orderedBreakpoints[i];
    if (bp in restValues) {
      resolvedValue = restValues[bp] as V;
      break;
    } else {
      i = i - 1;
    }
  }

  return resolvedValue;
};

const Data = () => {
  const value = useResponsiveValue({
    default: "meow",
    xs: "xs",
    sm: "sm",
    md: "md",
    lg: "lg",
    xl: "xl"
  });

  return <pre>{value}</pre>;
};

export default function App() {
  return (
    <BreakpointProvider breakpoints={breakpoints}>
      <Data />
    </BreakpointProvider>
  );
}

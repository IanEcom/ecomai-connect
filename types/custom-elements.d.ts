import "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }

  namespace React.JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};

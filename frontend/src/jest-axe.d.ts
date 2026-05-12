declare module 'jest-axe' {
  export const axe: any;
  export const toHaveNoViolations: any;
}

declare namespace vitest {
  interface Assertion<T = any> {
    toHaveNoViolations(): T;
  }
}

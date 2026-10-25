/**
 * webpack's `require.context` is not part of the standard TS lib types.
 * Merge it into NodeRequire so `require.context(...)` type-checks, while
 * keeping the call site literal so webpack can statically resolve the bundle.
 */
declare global {
  namespace NodeJS {
    interface Require {
      context(
        directory: string,
        useSubdirectories: boolean,
        regExp: RegExp
      ): {
        keys(): string[];
        (id: string): string | { default: string };
      };
    }
  }
}

export {};

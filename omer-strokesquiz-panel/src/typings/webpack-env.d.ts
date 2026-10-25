declare global {
  namespace NodeJS {
    interface Require {
      context(
        directory: string,
        useSubdirectories: boolean,
        regExp: RegExp
      ): {
        keys(): string[];
        (id: string):
          | string
          | {
              default: string;
            };
      };
    }
  }
}
export {};

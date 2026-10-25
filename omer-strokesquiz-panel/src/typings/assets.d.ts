/** Static assets imported for their emitted URL (webpack `asset/resource`). */
declare module '*.jpg' {
  const url: string;
  export default url;
}

declare module '*.png' {
  const url: string;
  export default url;
}

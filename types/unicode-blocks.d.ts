declare module 'unicode-blocks' {
  interface UnicodeBlock {
    start: number;
    end: number;
    name: string;
  }

  const blocks: UnicodeBlock[];
  export default blocks;
}

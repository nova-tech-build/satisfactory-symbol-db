declare module 'unicode-blocks' {
  export interface UnicodeBlock {
    start: number;
    end: number;
    name: string;
  }

  const blocks: UnicodeBlock[];
  export default blocks;
}

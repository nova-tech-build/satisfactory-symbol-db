import * as fontkit from 'fontkit'
import {Font} from 'fontkit'

export class TtFile {

  public readonly fonts: Font[]

  constructor(public readonly path: string) {

    const opened = fontkit.openSync(path)
    this.fonts = ('fonts' in opened) ? opened.fonts : [opened]
  }
}

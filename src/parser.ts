import { findFilesWithExtension } from './file'
import path from 'path'
import { HTMLElement, parse as parseDom } from 'node-html-parser'
import fs from 'fs'

export interface ComponentModification {
  filename: string
  filter: RegExp
  find: RegExp
  replace: string
  ownFilename: string;
}

export interface RawComponentModification {
  filename: string
  filter: RegExp
  find?: RegExp | null | string
  replace: string
  ownFilename: string;
}

interface BuildRawFromElOptions {
  find?: string
  replace?: string
}

class Parser {
  filepath: string
  filename: string
  filenameRegex: RegExp
  filenameIsRegex: boolean = false
  dom: HTMLElement

  constructor ( filepath: string ) {
    this.filepath = filepath
    this.dom = parseDom(fs.readFileSync(filepath, 'utf8'))
    this.filename = this.getFilename()
    this.filenameRegex = this.getFilenameRegex()
  }

  getFilename () {
    let filename = ''

    const file = this.dom.querySelector('file')
    if (file) {
      this.filenameIsRegex = file.hasAttribute('regex')

      filename = file.rawText
    }

    if (!filename) {
      filename = path.basename(this.filepath).replace('vuem', 'vue')
    }

    return filename
  }

  getFilenameRegex () {
    if (this.filenameIsRegex) {
      return new RegExp(this.filename)
    }

    const filename = this.filename.trim().replace(/\\+/g, '/')

    return new RegExp(
      `(${escape(filename)})`
    )
  }

  getModifications () {
    const modifications: ComponentModification[] = []
    const templates = this.dom.querySelectorAll('template')
    const scripts = this.dom.querySelectorAll('script')
    const styles = this.dom.querySelectorAll('style')

    for (const template of templates) {
      modifications.push(this.buildTemplateModification(template))
    }

    for (const script of scripts) {
      modifications.push(this.buildScriptModification(script))
    }

    for (const style of styles) {
      modifications.push(this.buildStyleModification(style))
    }

    return modifications
  }

  buildTemplateModification ( el: HTMLElement ): ComponentModification {
    return this.buildRawFromEl(el, {
      find: '(<\/template[^>]*>)',
    }) as ComponentModification
  }

  buildScriptModification ( el: HTMLElement ): ComponentModification {
    return this.buildRawFromEl(el, {
      find: '(<\/script[^>]*>)',
    }) as ComponentModification
  }

  buildStyleModification ( el: HTMLElement ): ComponentModification {
    return this.buildRawFromEl(el, {
      find: '(<\/style[^>]*>)'
    }) as ComponentModification
  }

  buildRawFromEl ( el: HTMLElement, options?: BuildRawFromElOptions ): RawComponentModification {
    let find: string = el.getAttribute('find') || options?.find || ''
    let replace = el.getAttribute('replace') || options?.replace || ''

    const before = el.getAttribute('before') || ''
    const after = el.getAttribute('after') || ''
    const trim = el.hasAttribute('trim')

    if (before) {
      find = `(${before})`
      replace = `$S$1`
    }

    if (after) {
      find = `(${after})`
      replace = `$1$S`
    }

    replace ||= "$S\n$1"

    const html = trim
      ? el.innerHTML.trim()
      : el.innerHTML

    replace = replace.replace(/\$S/g, html)

    return {
      filename: this.filename,
      filter: this.filenameRegex,
      find: find.length ? new RegExp(find) : null,
      replace,
      ownFilename: this.filepath
    }
  }
}

export function parseDir ( dir: string, skip: RegExp[] = [] ): ComponentModification[] {
  dir = path.resolve(dir)

  const files = findFilesWithExtension(dir, 'vuem')
  const modifications = []

  for (const file of files) {
    const parser = new Parser(file)

    if (skip.some(regex => regex.test(parser.filename))) {
      continue
    }

    modifications.push(...parser.getModifications())
  }

  return modifications
}

export function parseFile ( file: string ): ComponentModification[] {
  const parser = new Parser(file)

  return parser.getModifications()
}

function escape ( str: string ): string {
  return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
}

export { Parser, escape }



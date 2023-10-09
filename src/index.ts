import { Plugin } from 'vite'
import { ComponentModification, escape, parseDir, parseFile } from './parser'
import path from 'path'

interface Options extends Pick<Plugin, 'enforce' | 'apply'> {
  dirs?: string | string[]
  files?: string[]
  skip?: string[] | RegExp[]
}

export default function vueComponentModifications ( options: Options ): Plugin {
  let modifications: ComponentModification[] = []
  const modificationFileMap = new Map<string, string[]>()

  options.dirs ??= []

  const dirs = Array.isArray(options.dirs) ? options.dirs : [options.dirs]
  const skip = (options.skip || [])
    .map(skip => skip instanceof RegExp ? skip : new RegExp(escape(skip)))
  const files = (options.files || []).filter(file => !skip.some(regex => regex.test(file)))

  const parseModifications = () => {
    modifications = dirs.flatMap(dir => parseDir(dir, skip))
      .concat(files.flatMap(file => parseFile(file)))
  }

  parseModifications()

  if (!modifications.length) {
    return {} as any
  }

  function replaceModifications ( code: string, id: string ): string {
    return modifications.reduce(( code, modification ) => {
      // skip .vuem files
      if (id.endsWith('.vuem')) {
        return code
      }

      if (!modification.filter.test(id)) {
        return code
      }

      const hasFileInMap = modificationFileMap.has(modification.filename)
        && modificationFileMap.get(modification.filename)?.includes(id)

      if (!hasFileInMap) {
        modificationFileMap.set(
          modification.filename,
          (modificationFileMap.get(modification.filename) || []).concat(id)
        )
      }

      return code.replace(modification.find, modification.replace)
    }, code)
  }

  function findModificationByOwnFilename ( ownFilename: string ): ComponentModification | undefined {
    return modifications.find(( modification ) => {
      return modification.ownFilename === ownFilename
    })
  }

  return {
    name: 'vue-component-modifications',
    enforce: options.enforce,
    apply: options.apply,

    configureServer ( server ) {
      server.watcher.on('add', ( file ) => {
        if (!file.endsWith('.vuem')) {
          return
        }

        parseModifications()
      })

      server.watcher.on('unlink', ( file ) => {
        if (!file.endsWith('.vuem')) {
          return
        }

        const modification = findModificationByOwnFilename(file)

        if (!modification) {
          return
        }

        parseModifications()

        const modifiedFiles = modificationFileMap.get(modification.filename)

        modifiedFiles?.forEach(file => {
          server.watcher.emit(
            'change',
            file
          )
        })

        modificationFileMap.delete(modification.filename)
      })
    },

    renderChunk ( code, chunk ) {
      return replaceModifications(code, chunk.fileName)
    },

    transform ( code, id ) {
      return replaceModifications(code, id)
    },

    async handleHotUpdate ( ctx ) {
      if (ctx.file.endsWith('.vuem')) {
        parseModifications()

        const modification = findModificationByOwnFilename(ctx.file)
        if (!modification) {
          return
        }

        let modifiedFiles = modificationFileMap.get(modification.filename)

        // maybe modification filename was changed, try to find files by regex
        if (! modifiedFiles) {
          const watchedDirs = ctx.server.watcher.getWatched()

          modifiedFiles = Object.keys(watchedDirs).reduce(( files, dir ) => {
            const allFiles = watchedDirs[dir].map(file => path.join(dir, file))
            return files.concat(allFiles.filter(file => modification.filter.test(file)))
          }, [] as string[])

          if (modifiedFiles?.length) {
            modificationFileMap.set(modification.filename, modifiedFiles)
          }
        }

        modifiedFiles?.forEach(file => {
          ctx.server.watcher.emit(
            'change',
            file
          )
        })
      }

      const defaultRead = ctx.read
      ctx.read = async function () {
        return replaceModifications(await defaultRead(), ctx.file)
      }
    }
  }
}

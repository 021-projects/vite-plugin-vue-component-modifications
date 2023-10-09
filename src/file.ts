import fs from 'fs'
import path from 'path'

function findFilesWithExtension (
  dir: string,
  extension: string,
  fileList: string[] = []
) {
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Recursively search in subdirectories
      findFilesWithExtension(filePath, extension, fileList)
    } else if (path.extname(file) === `.${extension}`) {
      fileList.push(filePath)
    }
  }

  return fileList
}

export { findFilesWithExtension }

import { rename, rm, writeFile } from "node:fs/promises";

export interface TransactionFile {
  finalPath: string;
  temporaryPath: string;
  data: string | Buffer;
}

async function writeTransactionFile(path: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
  await writeFile(path, data, encoding);
}

async function promoteTransactionFile(temporaryPath: string, finalPath: string): Promise<void> {
  await rename(temporaryPath, finalPath);
}

async function removeTransactionFile(path: string): Promise<void> {
  await rm(path, { force: true });
}

export interface FileTransactionOperations {
  write: typeof writeTransactionFile;
  promote: typeof promoteTransactionFile;
  remove: typeof removeTransactionFile;
}

const filesystemOperations: FileTransactionOperations = {
  write: writeTransactionFile,
  promote: promoteTransactionFile,
  remove: removeTransactionFile
};

export async function commitFiles(files: TransactionFile[], operations: FileTransactionOperations = filesystemOperations): Promise<void> {
  const promoted: string[] = [];
  try {
    await Promise.all(files.map((file) => operations.write(file.temporaryPath, file.data, typeof file.data === "string" ? "utf8" : undefined)));
    for (const file of files) {
      await operations.promote(file.temporaryPath, file.finalPath);
      promoted.push(file.finalPath);
    }
  } catch (cause) {
    await Promise.allSettled([...files.map((file) => operations.remove(file.temporaryPath)), ...promoted.map((path) => operations.remove(path))]);
    throw cause;
  }
}

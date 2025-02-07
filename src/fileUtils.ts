import { promises as fs } from "node:fs";
import { FILE_SIZE_MESSAGE } from "./constants.js";

/**
 * Reads the content of a file with standardized header and
 * checks: if the file exceeds maxSize.
 *
 * @param filePath - The absolute (or resolved) file path.
 * @param maxSize - Maximum file size in bytes.
 * @param fileName - The name of the file (for header formatting).
 * @returns A Promise resolving to a string with the file header and either its content or an appropriate placeholder.
 */
export async function getFileContent(
  filePath: string,
  maxSize: number,
  fileName: string
): Promise<string | null> {
  try {
    const stat = await fs.stat(filePath);

    if (stat.size > maxSize) {
      if (process.env["DEBUG"]) {
        console.log(
          `[DEBUG] File too large: ${filePath} (${stat.size} bytes > ${maxSize} bytes)`
        );
      }
      return `================================\nFile: ${fileName}\n================================\n[${FILE_SIZE_MESSAGE(
        stat.size
      )}]`;
    }

    const content = await fs.readFile(filePath, "utf8");
    return `================================\nFile: ${fileName}\n================================\n${content}`;
  } catch (error) {
    if (process.env["DEBUG"]) {
      console.error(`[DEBUG] Error reading file ${filePath}:`, error);
    }
    return `================================\nFile: ${fileName}\n================================\n[Error reading file: ${
      error instanceof Error ? error.message : String(error)
    }]`;
  }
}

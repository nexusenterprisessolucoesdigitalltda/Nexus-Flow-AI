import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { FileProcessingError } from './errors';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 255);
}

export async function downloadFile(url: string, destPath: string): Promise<string> {
  const https = await import('https');
  const http = await import('http');

  ensureDir(path.dirname(destPath));
  const file = fs.createWriteStream(destPath);

  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new FileProcessingError(
          `Download failed with status ${response.statusCode}`,
          path.basename(destPath)
        ));
      }

      const totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      response.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
      });

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        logger.debug(`Downloaded ${downloadedSize} bytes to ${destPath}`);
        resolve(destPath);
      });
    });

    request.setTimeout(60000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(new FileProcessingError('Download timeout', path.basename(destPath)));
    });

    request.on('error', (err) => {
      file.close();
      if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
      reject(new FileProcessingError(
        `Download error: ${err.message}`,
        path.basename(destPath)
      ));
    });
  });
}

export function cleanupTempFile(filePath: string, delayMs: number = 5000): void {
  setTimeout(() => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug(`Cleaned up: ${filePath}`);
      }
    } catch (err) {
      logger.warn(`Cleanup failed for ${filePath}:`, err);
    }
  }, delayMs);
}

const MAX_EXTRACT_SIZE = 10 * 1024 * 1024;

export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  const stats = fs.statSync(filePath);
  if (stats.size > MAX_EXTRACT_SIZE) {
    throw new FileProcessingError(
      `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Max: 10MB`,
      path.basename(filePath)
    );
  }

  const handlers: Record<string, (p: string) => Promise<string>> = {
    '.txt': async (p) => fs.readFileSync(p, 'utf-8'),
    '.md': async (p) => fs.readFileSync(p, 'utf-8'),
    '.csv': async (p) => fs.readFileSync(p, 'utf-8'),
    '.json': async (p) => {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return JSON.stringify(data, null, 2);
    },
    '.pdf': extractFromPdf,
    '.xlsx': extractFromExcel,
    '.xls': extractFromExcel,
    '.docx': extractFromDocx,
  };

  const handler = handlers[ext];
  if (!handler) {
    throw new FileProcessingError(
      `Unsupported file format: ${ext}`,
      path.basename(filePath)
    );
  }

  return handler(filePath);
}

async function extractFromPdf(filePath: string): Promise<string> {
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (err: any) {
    throw new FileProcessingError(
      `PDF extraction failed: ${err.message}`,
      path.basename(filePath)
    );
  }
}

async function extractFromExcel(filePath: string): Promise<string> {
  try {
    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const parts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      parts.push(`[${sheetName}]`);
      for (const row of json) {
        if (row.length > 0) {
          parts.push(row.map(cell => cell != null ? String(cell) : '').join(' | '));
        }
      }
      parts.push('');
    }

    return parts.join('\n');
  } catch (err: any) {
    throw new FileProcessingError(
      `Excel extraction failed: ${err.message}`,
      path.basename(filePath)
    );
  }
}

async function extractFromDocx(filePath: string): Promise<string> {
  try {
    const mammoth = require('mammoth');
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (err: any) {
    throw new FileProcessingError(
      `DOCX extraction failed: ${err.message}`,
      path.basename(filePath)
    );
  }
}

export function truncateContent(content: string, maxChars: number = 15000): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars) + `\n\n[... conteúdo truncado de ${content.length} caracteres para ${maxChars}]`;
}

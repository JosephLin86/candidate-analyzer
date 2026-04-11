export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse')
  try {
    const data = await pdfParse(pdfBuffer)
    return data.text
  } catch {
    throw new Error('Failed to extract text from PDF')
  }
}
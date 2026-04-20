export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = require('pdf-parse')
    const parser = new PDFParse({ data: pdfBuffer })
    const result = await parser.getText()
    await parser.destroy?.()
    return result.text
  } catch (err) {
    console.error('PDF parse underlying error:', err)
    throw new Error('Failed to extract text from PDF')
  }
}
import { PDFDocument, rgb } from 'pdf-lib'

interface SignatureField {
  id: string
  type: 'signature' | 'initial' | 'date' | 'text'
  page: number
  x: number
  y: number
  width: number
  height: number
  value: string | null
}

interface MergeSignaturesParams {
  pdfUrl: string
  fields: SignatureField[]
}

/**
 * Merges signature images and text into a PDF document
 * Returns the modified PDF as a Uint8Array
 */
export async function mergeSignaturesIntoPdf({
  pdfUrl,
  fields
}: MergeSignaturesParams): Promise<Uint8Array> {
  // Fetch the original PDF
  const response = await fetch(pdfUrl)
  if (!response.ok) {
    throw new Error('Failed to fetch PDF')
  }

  const pdfBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(pdfBytes)
  const pages = pdfDoc.getPages()

  for (const field of fields) {
    if (!field.value) continue

    const pageIndex = field.page - 1
    if (pageIndex < 0 || pageIndex >= pages.length) continue

    const page = pages[pageIndex]
    const pageHeight = page.getHeight()

    // PDF coordinates have origin at bottom-left, our coordinates are top-left
    // So we need to flip the Y coordinate
    const pdfY = pageHeight - field.y - field.height

    if (field.type === 'date' || field.type === 'text') {
      // Draw text
      page.drawText(field.value, {
        x: field.x + 5,
        y: pdfY + field.height / 3,
        size: 12,
        color: rgb(0.1, 0.1, 0.1)
      })
    } else if (field.type === 'signature' || field.type === 'initial') {
      // Draw signature image
      try {
        // field.value is a data URL (data:image/png;base64,...)
        const base64Data = field.value.split(',')[1]
        if (!base64Data) continue

        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
        const image = await pdfDoc.embedPng(imageBytes)

        // Calculate dimensions to fit within the field while maintaining aspect ratio
        const imgDims = image.scale(1)
        const scale = Math.min(
          (field.width - 10) / imgDims.width,
          (field.height - 10) / imgDims.height
        )

        const scaledWidth = imgDims.width * scale
        const scaledHeight = imgDims.height * scale

        // Center the image in the field
        const imgX = field.x + (field.width - scaledWidth) / 2
        const imgY = pdfY + (field.height - scaledHeight) / 2

        page.drawImage(image, {
          x: imgX,
          y: imgY,
          width: scaledWidth,
          height: scaledHeight
        })
      } catch (error) {
        console.error('Failed to embed signature image:', error)
      }
    }
  }

  // Add a signature certificate/footer on the last page
  const lastPage = pages[pages.length - 1]
  const { width: lastPageWidth } = lastPage.getSize()

  const timestamp = new Date().toLocaleString('sv-SE', {
    dateStyle: 'long',
    timeStyle: 'short'
  })

  lastPage.drawText(`Signerat digitalt via SimpleSign - ${timestamp}`, {
    x: 50,
    y: 30,
    size: 8,
    color: rgb(0.5, 0.5, 0.5)
  })

  return pdfDoc.save()
}

/**
 * Generates a completion certificate as a separate PDF page
 */
export async function generateCompletionCertificate(
  documentTitle: string,
  signers: { name: string; email: string; signedAt: string }[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595, 842]) // A4 size

  const { width, height } = page.getSize()

  // Title
  page.drawText('Signeringscertifikat', {
    x: 50,
    y: height - 80,
    size: 24,
    color: rgb(0.1, 0.1, 0.2)
  })

  // Document name
  page.drawText(`Dokument: ${documentTitle}`, {
    x: 50,
    y: height - 130,
    size: 14,
    color: rgb(0.2, 0.2, 0.2)
  })

  // Signers section
  page.drawText('Signaturer:', {
    x: 50,
    y: height - 180,
    size: 12,
    color: rgb(0.3, 0.3, 0.3)
  })

  let yOffset = height - 210
  for (const signer of signers) {
    page.drawText(`• ${signer.name} (${signer.email})`, {
      x: 60,
      y: yOffset,
      size: 11,
      color: rgb(0.2, 0.2, 0.2)
    })

    page.drawText(`  Signerat: ${new Date(signer.signedAt).toLocaleString('sv-SE')}`, {
      x: 60,
      y: yOffset - 15,
      size: 9,
      color: rgb(0.5, 0.5, 0.5)
    })

    yOffset -= 45
  }

  // Footer
  const timestamp = new Date().toLocaleString('sv-SE', {
    dateStyle: 'long',
    timeStyle: 'long'
  })

  page.drawText(`Genererat: ${timestamp}`, {
    x: 50,
    y: 60,
    size: 9,
    color: rgb(0.5, 0.5, 0.5)
  })

  page.drawText('SimpleSign - E-signaturer för småföretag', {
    x: 50,
    y: 40,
    size: 9,
    color: rgb(0.5, 0.5, 0.5)
  })

  return pdfDoc.save()
}

/**
 * Combines multiple PDFs into one
 */
export async function combinePdfs(pdfs: Uint8Array[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create()

  for (const pdfBytes of pdfs) {
    const pdf = await PDFDocument.load(pdfBytes)
    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices())
    pages.forEach(page => mergedPdf.addPage(page))
  }

  return mergedPdf.save()
}

const PDFDocument = require('pdfkit')
const db = require('../config/db')

async function getMine(req, res) {
  try {
    const [certificates] = await db.query(
      `SELECT certificate_code AS certificateId, course_name AS courseName,
              student_name AS recipientName, issued_at AS completionDate
       FROM certificates
       WHERE user_id = ?
       ORDER BY issued_at DESC, id DESC`,
      [req.user.id]
    )
    res.json({ certificates })
  } catch (err) {
    console.error('Error fetching certificates:', err)
    res.status(500).json({ message: 'Error fetching certificates.' })
  }
}

async function findOwnedCertificate(userId, certificateId) {
  const [rows] = await db.query(
    `SELECT certificate_code AS certificateId, course_name AS courseName,
            student_name AS recipientName, issued_at AS completionDate
     FROM certificates
     WHERE certificate_code = ? AND user_id = ?
     LIMIT 1`,
    [certificateId, userId]
  )
  return rows[0] || null
}

async function getOne(req, res) {
  try {
    const certificate = await findOwnedCertificate(req.user.id, req.params.certificateId)
    if (!certificate) return res.status(404).json({ message: 'Certificate not found.' })
    res.json(certificate)
  } catch (err) {
    console.error('Error fetching certificate:', err)
    res.status(500).json({ message: 'Error fetching certificate.' })
  }
}

function formatDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error('Certificate has an invalid completion date.')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

function drawCertificate(doc, certificate) {
  const { width, height } = doc.page
  const navy = '#10243A'
  const gold = '#C9A64B'
  const mutedGold = '#E4D3A0'
  const left = 24
  const top = 24
  const frameWidth = width - left * 2
  const frameHeight = height - top * 2

  doc.rect(0, 0, width, height).fill('#FFFFFF')
  doc.lineWidth(3).strokeColor(navy).rect(left, top, frameWidth, frameHeight).stroke()
  doc.lineWidth(1.2).strokeColor(gold).rect(left + 9, top + 9, frameWidth - 18, frameHeight - 18).stroke()

  const cornerSize = 24
  const corners = [
    [left + 16, top + 16],
    [width - left - 16, top + 16],
    [left + 16, height - top - 16],
    [width - left - 16, height - top - 16]
  ]
  doc.lineWidth(1.5).strokeColor(gold)
  for (const [x, y] of corners) {
    doc.moveTo(x, y + cornerSize).lineTo(x, y).lineTo(x + cornerSize, y).stroke()
  }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(navy)
    .text('CODEQUEST', 0, 57, { align: 'center', characterSpacing: 3 })
  doc.font('Helvetica').fontSize(9).fillColor(gold)
    .text('JAVA PROGRAMMING  /  QUEST COMPLETION', 0, 76, { align: 'center', characterSpacing: 1.3 })
  doc.lineWidth(1).strokeColor(mutedGold)
    .moveTo(width * 0.36, 99).lineTo(width * 0.64, 99).stroke()

  doc.font('Helvetica-Bold').fontSize(29).fillColor(navy)
    .text('CERTIFICATE OF COMPLETION', left + 40, 117, {
      width: frameWidth - 80,
      align: 'center',
      characterSpacing: 1.2
    })
  doc.font('Helvetica').fontSize(12).fillColor('#596579')
    .text('This certificate is proudly presented to', left + 60, 169, {
      width: frameWidth - 120,
      align: 'center'
    })

  const recipient = String(certificate.recipientName || 'CodeQuest Adventurer')
  let recipientSize = 31
  while (recipientSize > 18 && doc.font('Helvetica-Bold').fontSize(recipientSize).widthOfString(recipient) > frameWidth - 160) {
    recipientSize -= 1
  }
  doc.font('Helvetica-Bold').fontSize(recipientSize).fillColor(navy)
    .text(recipient, left + 60, 196, {
      width: frameWidth - 120,
      align: 'center',
      lineBreak: false
    })
  doc.lineWidth(1.2).strokeColor(gold)
    .moveTo(width * 0.28, 239).lineTo(width * 0.72, 239).stroke()

  doc.font('Helvetica-Bold').fontSize(18).fillColor(navy)
    .text(certificate.courseName, left + 60, 253, {
      width: frameWidth - 120,
      align: 'center'
    })
  doc.font('Helvetica').fontSize(11).fillColor('#425168')
    .text(
      'This certificate is awarded in recognition of successfully completing all required levels and challenges in CodeQuest.',
      left + 110,
      290,
      { width: frameWidth - 220, align: 'center', lineGap: 3 }
    )

  const completionDate = formatDate(certificate.completionDate)
  doc.font('Helvetica').fontSize(10).fillColor('#596579')
    .text('COMPLETION DATE', left + 82, 367, { width: 190, align: 'center', characterSpacing: 1 })
  doc.font('Helvetica-Bold').fontSize(12).fillColor(navy)
    .text(completionDate, left + 82, 385, { width: 190, align: 'center' })

  const signatureX = width - left - 272
  doc.lineWidth(0.9).strokeColor('#687386')
    .moveTo(signatureX + 24, 382).lineTo(signatureX + 248, 382).stroke()
  doc.font('Helvetica-Bold').fontSize(12).fillColor(navy)
    .text('CodeQuest', signatureX + 24, 389, { width: 224, align: 'center' })
  doc.font('Helvetica').fontSize(9).fillColor('#596579')
    .text('Authorized Issuer', signatureX + 24, 405, { width: 224, align: 'center' })

  doc.font('Helvetica').fontSize(8).fillColor('#596579')
    .text(`CERTIFICATE ID  ${certificate.certificateId}`, 0, height - 60, {
      align: 'center',
      characterSpacing: 0.5
    })
  doc.font('Helvetica-Bold').fontSize(9).fillColor(gold)
    .text('</>  •  KEEP EXPLORING, KEEP BUILDING  •  </>', 0, height - 43, {
      align: 'center',
      characterSpacing: 0.7
    })
}

async function downloadPdf(req, res) {
  try {
    const certificate = await findOwnedCertificate(req.user.id, req.params.certificateId)
    if (!certificate) return res.status(404).json({ message: 'Certificate not found.' })

    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 0, right: 0, bottom: 0, left: 0 },
      autoFirstPage: true,
      info: {
        Title: `${certificate.courseName} Certificate`,
        Author: 'CodeQuest',
        Subject: `Certificate ${certificate.certificateId}`
      }
    })

    doc.on('error', err => {
      console.error('Error generating certificate PDF:', err)
      if (res.headersSent) res.destroy(err)
      else res.status(500).json({ message: 'Error generating certificate PDF.' })
    })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${certificate.certificateId}.pdf"`
    )
    doc.pipe(res)
    drawCertificate(doc, certificate)
    doc.end()
  } catch (err) {
    console.error('Error downloading certificate PDF:', err)
    if (!res.headersSent) res.status(500).json({ message: 'Error generating certificate PDF.' })
  }
}

module.exports = { getMine, getOne, downloadPdf }

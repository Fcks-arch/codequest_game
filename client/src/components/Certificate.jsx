import React, { useEffect, useState } from 'react'
import { Award, Check, Copy, Download, LockKeyhole, Printer, X } from 'lucide-react'
import './Certificate.css'

export function formatCertificateDate(value) {
  if (!value) return 'Date unavailable'
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00Z`)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  })
}

export function CertificateCard({ certificate, onView, onDownload, onPrint }) {
  return (
    <article className="certificate-card">
      <div className="certificate-card__icon" aria-hidden="true">
        <Award size={25} />
      </div>
      <div className="certificate-card__details">
        <p className="certificate-card__eyebrow">Course certificate</p>
        <h3>{certificate.courseName}</h3>
        <p>Completed {formatCertificateDate(certificate.completionDate)}</p>
        <code>{certificate.certificateId}</code>
      </div>
      <div className="certificate-card__actions">
        <button type="button" onClick={onView}>View Certificate</button>
        <button type="button" className="certificate-card__secondary" onClick={onDownload}>
          <Download size={15} aria-hidden="true" /> Download PDF
        </button>
        <button
          type="button"
          className="certificate-card__secondary"
          onClick={onPrint}
        >
          <Printer size={15} aria-hidden="true" /> Print Certificate
        </button>
      </div>
    </article>
  )
}

export function LockedCertificateCard() {
  return (
    <div className="certificate-locked">
      <LockKeyhole size={22} aria-hidden="true" />
      <div>
        <strong>Java Programming Certificate</strong>
        <p>Complete all CodeQuest levels to unlock your certificate.</p>
      </div>
    </div>
  )
}
 
export function CertificateView({ certificate, onClose }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = certificate
    ? (certificate.verificationUrl || `${window.location.origin}/verify/${certificate.certificateId}`)
    : ''
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const input = document.getElementById('certificate-share-input')
      input?.select()
      document.execCommand('copy')
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    document.body.classList.add('certificate-print-mode')
    return () => document.body.classList.remove('certificate-print-mode')
  }, [])

  if (!certificate) return null
  useEffect(() => {
    document.body.classList.add('certificate-print-mode')
    return () => document.body.classList.remove('certificate-print-mode')
  }, [])

  if (!certificate) return null

  return (
    <div className="certificate-view__backdrop" role="presentation" onMouseDown={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section
        className="certificate-view"
        role="dialog"
        aria-modal="true"
        aria-labelledby="certificate-view-title"
      >
        <div className="certificate-view__toolbar">
          <h2 id="certificate-view-title">Your CodeQuest Certificate</h2>
          <button type="button" onClick={onClose} aria-label="Close certificate">
            <X size={19} aria-hidden="true" />
          </button>
        </div>
                <div className="certificate-share">
          <input id="certificate-share-input" readOnly value={shareUrl} onFocus={e => e.target.select()} />
          <button type="button" onClick={copyLink}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
        <div className="certificate-print-root">
          <div className="certificate-art">
            <div className="certificate-art__corner certificate-art__corner--top-left" />
            <div className="certificate-art__corner certificate-art__corner--top-right" />
            <div className="certificate-art__corner certificate-art__corner--bottom-left" />
            <div className="certificate-art__corner certificate-art__corner--bottom-right" />
            <div className="certificate-art__brand">
              <span className="certificate-art__crest" aria-hidden="true">CQ</span>
              <span>CODEQUEST</span>
            </div>
            <p className="certificate-art__subtitle">JAVA PROGRAMMING  /  QUEST COMPLETION</p>
            <div className="certificate-art__rule" />
            <h3>CERTIFICATE OF COMPLETION</h3>
            <p className="certificate-art__presented">This certificate is proudly presented to</p>
            <p className="certificate-art__recipient">{certificate.recipientName}</p>
            <div className="certificate-art__name-rule" />
            <p className="certificate-art__course">{certificate.courseName}</p>
            <p className="certificate-art__recognition">
              This certificate is awarded in recognition of successfully completing all required levels and challenges in CodeQuest.
            </p>
            <div className="certificate-art__footer">
              <div>
                <span className="certificate-art__label">COMPLETION DATE</span>
                <strong>{formatCertificateDate(certificate.completionDate)}</strong>
              </div>
              <div className="certificate-art__signature">
                <strong>CodeQuest</strong>
                <span>Authorized Issuer</span>
              </div>
            </div>
            <p className="certificate-art__id">CERTIFICATE ID&nbsp;&nbsp; {certificate.certificateId}</p>
            <p className="certificate-art__id">VERIFY&nbsp;&nbsp; {shareUrl}</p>
            <p className="certificate-art__motto">&lt;/&gt;&nbsp; KEEP EXPLORING, KEEP BUILDING &nbsp;&lt;/&gt;</p>
          </div>
        </div>
      </section>
    </div>
  )
}

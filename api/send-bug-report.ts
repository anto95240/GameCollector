import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'
import { config } from 'dotenv'

// Charge explicitement le .env.local pour Vercel Dev
config({ path: '.env.local' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  const { email, type, message } = req.body

  if (!email || !type || !message) {
    return res.status(400).json({ message: 'Veuillez remplir tous les champs.' })
  }

  try {
    let transporter
    const isProduction =
      process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'

    // 1. CHOIX DU SERVEUR D'ENVOI SELON L'ENVIRONNEMENT
    if (isProduction) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_APP_PASSWORD,
        },
      })
    } else {
      transporter = nodemailer.createTransport({
        host: 'sandbox.smtp.mailtrap.io',
        port: 587,
        auth: {
          user: process.env.MAILTRAP_USER,
          pass: process.env.MAILTRAP_PASS,
        },
      })
    }

    // Couleurs Cyber / Console OS pour GameCollector
    const mainColor = type === 'bug' ? '#ff3366' : '#00ffcc'
    const textColor = type === 'bug' ? '#ffffff' : '#0f172a'

    // 2. FORMATAGE DE L'EMAIL
    const emailHtml = `
      <div style="font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: auto; border: 1px solid #334155; border-radius: 8px; overflow: hidden; background-color: #0f172a; color: #cbd5e1;">
        <div style="background-color: ${mainColor}; padding: 20px; color: ${textColor}; text-align: center; border-bottom: 2px solid ${mainColor};">
          <h2 style="margin: 0; text-transform: uppercase; letter-spacing: 2px;">Nouveau ticket - GameCollector</h2>
        </div>
        <div style="padding: 20px;">
          <p><strong>Utilisateur :</strong> ${email}</p>
          <p><strong>Catégorie :</strong> <span style="background: #1e293b; padding: 4px 8px; border-radius: 4px; text-transform: uppercase; font-size: 12px; color: ${mainColor}; border: 1px solid ${mainColor};">${type}</span></p>
          <p><strong>Environnement :</strong> <span style="font-weight: bold; color: #94a3b8;">${isProduction ? 'PRODUCTION' : 'DEVELOPPEMENT'}</span></p>
          <hr style="border: none; border-top: 1px dashed #334155; margin: 20px 0;" />
          <p><strong>Message :</strong></p>
          <p style="white-space: pre-wrap; background: #1e293b; padding: 15px; border-left: 4px solid ${mainColor}; color: #e2e8f0; font-size: 14px; line-height: 1.5;">${message}</p>
        </div>
      </div>
    `

    // 3. PARAMÉTRAGE DE L'EXPÉDITEUR / DESTINATAIRE
    const senderName = isProduction ? 'GameCollector App' : 'GameCollector (DEV)'
    const centralEmail = process.env.EMAIL_USER || 'contact@gamecollector.app'

    await transporter.sendMail({
      from: `"${senderName}" <${centralEmail}>`,
      to: centralEmail,
      replyTo: email,
      subject: `[GAME COLLECTOR] - [${type.toUpperCase()}] Nouveau retour utilisateur`,
      html: emailHtml,
    })

    res.status(200).json({ success: true, message: 'Message envoyé avec succès.' })
  } catch (error: any) {
    console.error("Erreur d'envoi d'email:", error)
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de l'email.",
      error: error?.message || String(error),
    })
  }
}

# 🎯 NEXUS CYPHER - Capture the Flag Landing Page

A premium, visually striking cyberpunk-themed landing page for the NEXUS CYPHER CTF competition, hosted by Nexus Vyoma at ISL Engineering College, Hyderabad.

## 🚀 Features

- **Stunning Cyberpunk Aesthetic**: Neon gradients, glowing effects, and animated backgrounds
- **Butter-Smooth Animations**: Powered by Framer Motion for seamless user experience
- **Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **Performance Optimized**: Built with Next.js 14+ and modern web standards
- **SEO Ready**: Comprehensive metadata and Open Graph tags
- **Accessibility Compliant**: Reduced motion support and keyboard navigation

## 🎨 Sections

1. **Hero Section**: Full viewport logo display with animated entrance
2. **Event Details**: Date (12 NOV), Time (10-3), Venue (SEMINAR HALL)
3. **About CTF**: Engaging description of Capture the Flag competitions
4. **Competition Tracks**: 
   - 🌐 Web Exploitation
   - 🔒 Cryptography
   - 👆 Forensics
5. **Footer**: Organizer information and branding

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: CSS Modules
- **Animations**: Framer Motion
- **Fonts**: Orbitron & Rajdhani (Google Fonts)
- **Image Optimization**: Next.js Image component

## 📦 Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🌐 Development Server

Open [http://localhost:3000](http://localhost:3000) to view the landing page.

## 🎨 Color Palette

- **Primary (Hot Pink)**: `#FF0099`, `#FF1493`
- **Secondary (Cyan)**: `#00D9FF`, `#00F0FF`
- **Accent (Purple)**: `#9D00FF`, `#6B00FF`
- **Base (Dark)**: `#0A0E27`, `#000000`

## 📁 Project Structure

```
nexus-cipher-landing/
├── app/
│   ├── page.tsx              # Main landing page
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Global styles & design system
├── components/
│   ├── Hero.tsx              # Hero section with logo
│   ├── EventDetails.tsx      # Event information cards
│   ├── About.tsx             # CTF description
│   ├── Categories.tsx        # Competition tracks
│   ├── CTAButton.tsx         # Call-to-action button
│   ├── Footer.tsx            # Footer with branding
│   └── BackgroundEffects.tsx # Animated background
├── styles/
│   └── [ComponentName].module.css  # Component-specific styles
├── public/
│   ├── nexus-cipher-logo.png      # Event logo
│   └── nexus-cipher-poster.png    # Event poster
└── next.config.ts            # Next.js configuration
```

## 🎯 Customization

### Update Event Details
Edit `components/EventDetails.tsx` to change date, time, or venue.

### Update CTA Button Link
Edit `components/CTAButton.tsx` and replace `href="#"` with your competition platform URL.

### Modify Colors
Edit CSS variables in `app/globals.css` under the `:root` selector.

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Build for Static Export
```bash
npm run build
```

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## ⚡ Performance

- **Next.js Image Optimization**: Automatic image resizing and format conversion
- **CSS Modules**: Scoped styles for better performance
- **Framer Motion**: Hardware-accelerated animations
- **Reduced Motion Support**: Respects user accessibility preferences

## 🎓 Event Information

**Event**: NEXUS CYPHER - Capture the Flag  
**Organizer**: Nexus Vyoma  
**Institution**: ISL Engineering College, Hyderabad  
**Date**: 12 November  
**Time**: 10:00 AM - 3:00 PM  
**Venue**: Seminar Hall  

## 📄 License

Created for NEXUS CYPHER CTF © 2024

---

**Hack. Learn. Conquer.** 🚀

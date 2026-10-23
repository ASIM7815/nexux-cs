# 🚀 Quick Start Guide - NEXUS CYPHER CTF

Get your CTF platform running in 5 minutes!

---

## ⚡ Step 1: Start the Server

```bash
cd nexus-cipher-landing
npm run dev
```

Open browser: `http://localhost:3000`

---

## 🔐 Step 2: Login as Admin

1. Click "ADMIN LOGIN" on landing page (or go to `/admin`)
2. Username: **ISL**
3. Password: **ISLcollege**

---

## 👥 Step 3: Create Teams

1. In admin panel, click "Teams" in navigation
2. Click "Create Team" button
3. Enter team name: **TeamAlpha**
4. Enter password: **a** (yes, just one character!)
5. Click "Create Team"
6. Repeat for more teams

---

## 🎯 Step 4: Create Challenges with Files

1. Click "Challenges" in navigation
2. Click "Create Challenge"
3. Fill in:
   - **Title**: File Analysis Challenge
   - **Description**: Download and analyze the file to find the flag
   - **Category**: Forensics
   - **Points**: 100
   - **Flag**: NEXUS{found_the_secret}
4. **Upload File**: Click "Choose File" and select any file (.zip, .txt, .pdf)
5. Click "Create Challenge"

---

## 🏆 Step 5: Test as Team

1. Open new incognito window: `http://localhost:3000/participantauth`
2. Login with team credentials:
   - Team name: **TeamAlpha**
   - Password: **a**
3. Browse challenges
4. Click on your challenge
5. **Download the file** from the "📎 Attachments" section
6. Submit the flag: **NEXUS{found_the_secret}**
7. Watch scoreboard update in 0.3 seconds!

---

## 🎉 You're Done!

Your CTF platform is now fully operational with:
- ✅ Admin can create teams
- ✅ Admin can upload files to challenges
- ✅ Teams can download files
- ✅ Flag submission works
- ✅ Scoreboard updates every 0.3 seconds
- ✅ Multi-device login works

---

## 🔄 What Happens Automatically

Every **0.3 seconds** (300ms), the following auto-refresh:
- Scoreboard rankings
- Challenge solve counts
- Team lists
- Admin statistics

**No manual refresh needed!**

---

## 📁 File Upload Details

### What You Can Upload
- Any file type: .zip, .txt, .pdf, .pcap, .png, etc.
- Files stored in Neon Storage (S3-compatible)
- Secure pre-signed download URLs
- File size shown to teams

### Where Files Go
- **Storage**: Neon Storage bucket `files`
- **Database**: `challenge_attachments` table
- **Display**: Teams see download button with filename and size

---

## 🌐 Multi-Device Testing

Test unlimited simultaneous logins:

1. **Device 1**: Browser window - login as TeamAlpha
2. **Device 2**: Incognito window - login as TeamAlpha (same credentials)
3. **Device 3**: Another browser - login as TeamAlpha (same credentials)

All 3 sessions work simultaneously! ✅

---

## 🎨 Theme Verification

Check if cyberpunk theme is working:
- **Pink accents** (#FF0099) - Headers, borders
- **Cyan accents** (#00D9FF) - Links, badges  
- **Purple gradients** (#9D00FF) - Buttons
- **Matrix rain** - Background animation on landing page
- **Neon glows** - Hover effects

---

## 🐛 Quick Troubleshooting

### Can't login?
- Check `.env.local` has DATABASE_URL
- Run `npm install` again
- Verify Neon database is accessible

### File upload fails?
- Check `.env.local` has all Neon Storage variables
- Verify bucket name is exactly `files`
- Check AWS credentials are correct

### Auto-refresh not working?
- Clear browser cache
- Check browser console for errors
- Verify page loads completely

### File download doesn't work?
- Check file uploaded successfully (see database)
- Verify Neon Storage bucket permissions
- Try accessing file URL directly

---

## 📦 Build for Production

When ready to deploy:

```bash
npm run build
npm start
```

Then deploy to Vercel:

```bash
vercel
```

Update `NEXTAUTH_URL` in Vercel environment variables to your production URL.

---

## 🎯 Test All Features Checklist

Quick validation that everything works:

- [ ] Admin login (ISL/ISLcollege)
- [ ] Create team with 1-char password
- [ ] Team login from 2+ devices simultaneously
- [ ] Create challenge with file attachment
- [ ] Team can see and download file
- [ ] Submit correct flag (points awarded)
- [ ] Submit incorrect flag (recorded)
- [ ] Scoreboard updates in 0.3 seconds
- [ ] Hints unlock with point cost
- [ ] Admin can edit/delete challenges
- [ ] Admin can edit/delete teams

---

## 💡 Pro Tips

1. **Demo Data**: Database already has 7 categories and sample challenges
2. **Password Rules**: Accepts any password length ≥1 character (no complexity rules)
3. **Session Handling**: No session locking - unlimited devices per team
4. **Auto-Refresh**: Set to 300ms (0.3s) - can change in client components if needed
5. **File Naming**: Files stored as `challenge-{id}-{timestamp}-{original-name}`

---

## 📚 More Documentation

- **PLATFORM_COMPLETE.md** - Full feature list
- **FILE_UPLOAD_TESTING.md** - Detailed file upload testing
- **NEON_STORAGE_SETUP.md** - Neon Storage configuration
- **FILE_UPLOAD_COMPLETE.md** - Technical implementation details

---

## 🎊 Enjoy Your CTF Platform!

Everything is ready to go. Run your competition with confidence! 🚀

**Questions?** Check the documentation files or examine the code:
- `/lib/storage/neon-storage.ts` - File operations
- `/app/api/upload/route.ts` - Upload endpoint
- `/app/admin/challenges/` - Challenge management
- `/app/arena/challenges/[id]/` - Challenge details with download

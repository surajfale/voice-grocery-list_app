# Usage Guide

Complete guide for using the Voice Grocery List App, from getting started to advanced features.

## Table of Contents

- [Getting Started](#getting-started)
- [Voice Recognition](#voice-recognition)
- [Manual Input](#manual-input)
- [Managing Lists](#managing-lists)
- [Categories](#categories)
- [Sharing & Export](#sharing--export)
- [Theme Customization](#theme-customization)
- [Account Management](#account-management)
- [PWA Installation](#pwa-installation)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Tips & Best Practices](#tips--best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Creating an Account

1. Visit the app at your deployment URL
2. Click **"Create Account"** on the login page
3. Fill in your details:
   - First Name
   - Last Name
   - Email Address
   - Password (minimum 6 characters)
4. Click **"Sign Up"**
5. Check your email for a welcome message

### Logging In

1. Enter your registered email and password
2. Click **"Sign In"**
3. Your grocery lists will load automatically

### First Time Setup

After logging in for the first time:

1. **Select a Date** - Today's date is selected by default
2. **Add Items** - Use voice or manual input
3. **Explore Settings** - Customize theme and preferences
4. **Read Help** - Access the help page for detailed guidance

## Voice Recognition

### Starting Voice Input

1. Click the **microphone button** (large circular button)
2. Allow microphone access when prompted (first time only)
3. Start speaking your grocery items
4. Click the microphone again to stop

### Voice Input Modes

#### Single Item Mode
Say one item at a time:
- **"Milk"** → Adds "milk" to Dairy category
- **"Apples"** → Adds "apples" to Produce
- **"Basmati rice"** → Adds "basmati rice" to Asian Pantry

#### Multiple Items Mode
Say several items in one go:
- **"Onion spinach milk"** → Adds 3 separate items
- **"I need eggs bread and cheese"** → Adds 3 items
- **"Get me some apples bananas and oranges"** → Adds 3 fruits

### Natural Speech Support

The app intelligently filters filler words and understands natural speech:

**What You Say** → **What Gets Added**

| Your Speech | Items Added |
|-------------|-------------|
| "Uhh I need milk and umm bread" | milk, bread |
| "You know, like, some apples" | apples |
| "Get me basmati rice" | basmati rice |
| "I think we need... tomatoes" | tomatoes |

### Compound Item Detection

The app recognizes grocery items with multiple words:

- **Basmati rice** (not "basmati" + "rice")
- **Green chilies** (not "green" + "chilies")
- **Olive oil** (not "olive" + "oil")
- **Ice cream** (not "ice" + "cream")

### Voice Recognition Tips

✅ **Do:**
- Speak clearly and at a normal pace
- Pause briefly between items
- Use natural speech ("I need milk")
- Say compound items together ("olive oil")

❌ **Don't:**
- Rush or speak too fast
- Whisper or speak too softly
- Use background music/TV
- Cover the microphone

### Spell Correction

If the speech recognition mishears an item, the app will:

1. **Check** against its grocery database
2. **Suggest** the correct spelling
3. **Ask** for confirmation via dialog
4. **Add** the corrected item if you confirm

**Example:**
- You say: "bagg" (misheard)
- App suggests: "Did you mean 'bag'?"
- Click "Yes" to add "bag"
- Click "No" to try again

## Manual Input

### Adding Items Manually

1. Click the **text input field** (or press `/` key)
2. Type the item name
3. Press **Enter** or click **Add**

### Autocomplete Suggestions

As you type, suggestions appear based on:
- Common grocery items
- Your previous items
- Category-specific items

**Example:**
- Type "tom" → See "tomato", "tomatoes", "tomato sauce"
- Press **Down Arrow** to select
- Press **Enter** to add

### Bulk Input

Add multiple items at once:
- Type: "milk bread eggs"
- Press Enter
- All 3 items are added separately

## Managing Lists

### Selecting a Date

Use the **date picker** at the top:
- Click the calendar icon
- Select a date
- List for that date loads automatically
- Create new lists by selecting future dates

### Checking Off Items

- Click the **checkbox** next to any item
- Item is marked as completed
- Progress bar updates automatically
- Completed items show with strikethrough

### Editing Items

1. Hover over an item
2. Click the **edit icon** (pencil)
3. Modify the text
4. Press Enter or click away to save

### Deleting Items

1. Hover over an item
2. Click the **delete icon** (trash can)
3. Item is removed immediately
4. No confirmation dialog (quick action)

### Clearing Completed Items

- Click **"Clear Completed"** button
- All checked items are removed
- Unchecked items remain

### Deleting the Entire List

1. Click **menu icon** (⋮) at top right
2. Select **"Delete List"**
3. Confirm deletion
4. List is permanently removed

## Categories

### Understanding Categories

Items are automatically sorted into:

| Category | Example Items |
|----------|---------------|
| **Produce** | Apples, tomatoes, lettuce, onions |
| **Dairy & Eggs** | Milk, cheese, yogurt, butter, eggs |
| **Meat & Seafood** | Chicken, beef, salmon, shrimp |
| **Bakery** | Bread, bagels, croissants, tortillas |
| **Frozen Foods** | Ice cream, frozen vegetables, pizza |
| **Pantry Staples** | Flour, sugar, salt, oil, pasta |
| **Asian Pantry** | Soy sauce, rice vinegar, noodles, miso |
| **Indian Pantry** | Basmati rice, turmeric, garam masala |
| **Beverages** | Coffee, tea, juice, soda |
| **Snacks** | Chips, cookies, popcorn, nuts |
| **Health & Beauty** | Shampoo, soap, toothpaste |
| **Household** | Paper towels, detergent, trash bags |
| **Other** | Items that don't fit above categories |

### Expanding/Collapsing Categories

- Click the **category header** to collapse/expand
- Click **"Expand All"** to show all categories
- Click **"Collapse All"** to hide all categories

### Category-Based Shopping

Shop more efficiently:
1. Expand categories as you move through store
2. Check off items as you add to cart
3. Collapse completed categories
4. See progress bar for overall completion

## Sharing & Export

### Share List (Mobile)

On supported devices (Android, iOS):
1. Click **"Share"** button
2. Choose sharing method:
   - Text message
   - Email
   - WhatsApp
   - Other apps
3. List is shared as formatted text

### Download as Image

1. Click **"Download"** → **"As Image"**
2. Choose format:
   - PNG (better quality)
   - JPEG (smaller size)
3. Image saves to Downloads folder
4. Contains all items organized by category

### Download as PDF

1. Click **"Download"** → **"As PDF"**
2. PDF generates with:
   - App header
   - Date
   - Categorized items
   - Clean layout for printing
3. Perfect for printing or emailing

### Print List

1. Click **"Print"** button
2. Browser print dialog opens
3. Select printer or "Save as PDF"
4. Print with clean formatting

## Theme Customization

### Accessing Theme Settings

1. Click **settings icon** (⚙️) in header
2. Or navigate to Settings page
3. Theme section at the top

### Dark/Light Mode

Toggle between modes:
- **Light Mode**: White background, dark text
- **Dark Mode**: Dark background, light text
- Saves preference automatically
- Syncs across devices

### Color Schemes

Choose from predefined themes:

| Theme | Primary Color | Best For |
|-------|---------------|----------|
| **Indigo** | Purple-blue | Default, balanced |
| **Blue** | Sky blue | Professional |
| **Green** | Nature green | Eco-friendly feel |
| **Purple** | Rich purple | Creative look |
| **Orange** | Warm orange | Energetic vibe |
| **Pink** | Soft pink | Playful style |

**To Change:**
1. Open theme settings
2. Click a color option
3. UI updates immediately
4. Preference is saved

### Custom Theme

Create your own color scheme:
1. Select "Custom" option
2. Choose primary color
3. Choose accent color
4. See preview in real-time
5. Save when satisfied

## Account Management

### Updating Profile

1. Go to **Settings** → **Account**
2. Update:
   - First Name
   - Last Name
   - Email (requires verification)
3. Click **"Save Changes"**

### Changing Password

1. Go to **Settings** → **Security**
2. Enter current password
3. Enter new password (min 6 characters)
4. Confirm new password
5. Click **"Update Password"**
6. Receive confirmation email

### Forgot Password

1. Click **"Forgot Password?"** on login page
2. Enter your registered email
3. Check email for reset link
4. Click link (valid for 1 hour)
5. Enter new password
6. Receive confirmation email

### Email Verification Details

Reset emails include anti-phishing details:
- Your masked email (j***@gmail.com)
- Request IP location
- Request timestamp
- One-time use notice

### Deleting Account

⚠️ **Permanent Action - Cannot be Undone**

1. Go to **Settings** → **Account**
2. Scroll to **Danger Zone**
3. Click **"Delete Account"**
4. Confirm deletion
5. All data is permanently removed:
   - User profile
   - All grocery lists
   - Preferences

## PWA Installation

### Android (Chrome)

1. Visit the app in Chrome
2. Wait for "Add to Home Screen" prompt
3. Tap **"Install"**
   - Or: Menu (⋮) → **"Add to Home Screen"**
4. App icon appears on home screen
5. Opens in full-screen mode

### iOS (Safari)

1. Visit the app in Safari
2. Tap **Share button** (box with arrow)
3. Scroll and tap **"Add to Home Screen"**
4. Customize name if desired
5. Tap **"Add"**
6. App icon appears on home screen

### Desktop (Chrome, Edge)

1. Visit app in browser
2. Look for install icon in address bar
3. Click **"Install"** or **"Add"**
4. App opens in standalone window
5. Pin to taskbar for quick access

### PWA Benefits

- ⚡ **Faster**: Instant loading from cache
- 📱 **Native Feel**: Full-screen, no browser UI
- 🔌 **Offline**: Works without internet
- 🏠 **Home Screen**: Quick access icon
- 🔄 **Auto-Update**: Updates automatically

## Keyboard Shortcuts

### Global Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search/input field |
| `Esc` | Close dialogs/modals |
| `Ctrl + K` | Open quick actions |
| `?` | Show keyboard shortcuts |

### List Management

| Key | Action |
|-----|--------|
| `N` | New list |
| `E` | Edit selected item |
| `Delete` | Delete selected item |
| `Space` | Toggle item completion |
| `Ctrl + A` | Select all items |

### Navigation

| Key | Action |
|-----|--------|
| `H` | Go to Home |
| `S` | Go to Settings |
| `T` | Toggle theme |
| `←` | Previous date |
| `→` | Next date |

## Tips & Best Practices

### Voice Input Tips

1. **Batch Similar Items**: Say multiple items in one recording
2. **Use Compound Names**: "Basmati rice" not "rice basmati"
3. **Speak Naturally**: Don't worry about filler words
4. **Check Corrections**: Review suggested corrections
5. **Background Noise**: Minimize for better accuracy

### List Organization

1. **Shop by Category**: Expand categories as you shop
2. **Check Off Items**: Mark as you add to cart
3. **Use Dates**: Separate lists for different shopping trips
4. **Review Before Shopping**: Check list completeness
5. **Clear Completed**: Clean up after shopping

### Account Security

1. **Strong Password**: Use 8+ characters, mix types
2. **Verify Emails**: Check sender for password resets
3. **Log Out**: On shared devices
4. **Update Password**: Periodically change
5. **Check Activity**: Review reset emails for unauthorized access

### Performance

1. **Install PWA**: Better performance than browser
2. **Clear Old Lists**: Delete lists you no longer need
3. **Update App**: Refresh occasionally for updates
4. **Use WiFi**: For initial load and sync
5. **Enable Notifications**: Get update alerts

## Troubleshooting

### Voice Recognition Not Working

**Problem**: Microphone button doesn't respond

**Solutions**:
1. Check browser permissions (Settings → Site Permissions)
2. Ensure HTTPS connection (required for voice)
3. Try different browser (Chrome recommended)
4. Restart browser
5. Check microphone hardware

**Problem**: Items not recognized correctly

**Solutions**:
1. Speak more clearly
2. Reduce background noise
3. Move closer to microphone
4. Speak at normal pace
5. Use manual input as fallback

### Items Not Syncing

**Problem**: Changes not appearing on other devices

**Solutions**:
1. Check internet connection
2. Refresh the page
3. Log out and log back in
4. Clear browser cache
5. Check if logged in to same account

### App Won't Load

**Problem**: Blank screen or loading forever

**Solutions**:
1. Hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check internet connection
4. Try incognito/private mode
5. Update browser

### Items in Wrong Category

**Problem**: Item categorized incorrectly

**Solutions**:
1. **Temporary**: Move manually (not yet implemented)
2. **Report**: Let us know for database update
3. **Workaround**: Add note to item name

### PWA Issues

**Problem**: Install prompt not showing

**Solutions**:
1. Visit site multiple times (Chrome requirement)
2. Wait 5+ minutes between visits
3. Ensure HTTPS connection
4. Check if already installed
5. Try different browser

**Problem**: Offline mode not working

**Solutions**:
1. Load app while online first
2. Check service worker in DevTools
3. Clear cache and reload
4. Reinstall PWA

### Email Issues

**Problem**: Not receiving emails

**Solutions**:
1. Check spam/junk folder
2. Verify email address is correct
3. Add noreply@yourdomain.com to contacts
4. Wait a few minutes (delivery delay)
5. Try password reset again

### Account Access

**Problem**: Can't log in

**Solutions**:
1. Verify email/password
2. Use "Forgot Password" if needed
3. Check Caps Lock
4. Try different browser
5. Contact support

### Performance Issues

**Problem**: App running slow

**Solutions**:
1. Close other tabs/apps
2. Clear browser cache
3. Restart browser
4. Update browser
5. Install PWA version

## Getting Help

### In-App Help

- Click **"Help"** icon (❓) in header
- Access comprehensive user guide
- View video tutorials (if available)
- See FAQ section

### Contact Support

- Email: support@your-domain.com (update with actual)
- GitHub Issues: [Report a bug](https://github.com/surajfale/voice-grocery-list_app/issues)
- Response time: 24-48 hours

### Community

- Star the project on GitHub
- Share feedback
- Suggest features
- Report bugs

---

**Need more help?** Check the [Architecture Guide](./Architecture.md) for technical details or [Deployment Guide](./Deployment.md) for hosting information.

**Last Updated**: October 2024

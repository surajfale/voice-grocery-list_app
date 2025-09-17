# JSONBin.io Setup Instructions

## Current Status
Your app is currently using **localStorage fallback** because the JSONBin.io Master Key is invalid.

## How to Get a Valid JSONBin.io API Key

1. **Visit JSONBin.io**: Go to https://jsonbin.io/
2. **Sign Up**: Create a free account
3. **Get API Key**: 
   - Go to "API Keys" section
   - Copy your Master Key (looks like: `$2a$10$abcd1234...`)
4. **Update .env file**:
   ```
   VITE_JSONBIN_MASTER_KEY=your_actual_master_key_here
   ```

### Recommended: use base64-encoded key to avoid `.env` expansion issues

Because the JSONBin master key contains `$` characters (for example `$2a$10$...`), many `.env` loaders will try to expand `$VARIABLE` sequences and can corrupt or truncate the key. To avoid this, encode your key as base64 and set `VITE_JSONBIN_MASTER_KEY_B64` instead. The app will automatically decode it at runtime.

Example (bash / WSL):

```bash
# Encode the key (replace the sample key with your actual key)
echo -n '$2a$10$TdUtcP12LBiWtKEhdTQDouAjPzMtLgLPZE3PZSxGOm9740J3I.AwW' | base64
# Copy the output and add to .env:
# VITE_JSONBIN_MASTER_KEY_B64=<paste-base64-here>
```

Example (PowerShell):

```powershell
# Encode the key (replace the sample key with your actual key)
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('$2a$10$TdUtcP12LBiWtKEhdTQDouAjPzMtLgLPZE3PZSxGOm9740J3I.AwW'))
# Copy the output and add to .env:
# VITE_JSONBIN_MASTER_KEY_B64=<paste-base64-here>
```

Then restart your dev server so Vite picks up the new environment variable.

Helper script
-------------

There is a helper script to encode your JSONBin master key and optionally update `.env`:

POSIX (bash / WSL):

```bash
./scripts/encode-jsonbin-key.sh       # prompts for key and prints base64
./scripts/encode-jsonbin-key.sh -w    # write base64 into .env (backup made)
./scripts/encode-jsonbin-key.sh -w -t # write and test against JSONBin
```

PowerShell (Windows):

```powershell
.\scripts\encode-jsonbin-key.ps1     # prompts for key and prints base64
.\scripts\encode-jsonbin-key.ps1 -WriteEnv
.\scripts\encode-jsonbin-key.ps1 -WriteEnv -Test
```


## Current Behavior

✅ **What Works Now:**
- User registration and login
- Encrypted password storage
- Complete authentication flow
- All functionality works locally

⚠️ **What's Limited:**
- No cloud synchronization across devices
- Data stored in browser localStorage only
- Data will be lost if browser data is cleared

## Testing the App Now

The app is fully functional for testing! You can:

1. **Create accounts** with first name, last name, email, password
2. **Test login errors** with non-existent users
3. **Use all grocery list features**
4. **Test privacy** - each user has separate data

When you're ready for cloud sync, just update the JSONBin key and restart the app!
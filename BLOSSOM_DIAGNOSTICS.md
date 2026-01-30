# Blossom Server Upload Diagnostics

## How to Check if Files Are Being Stored on Your Synology NAS

I've added a **test upload button** to help you verify if your Synology Blossom server is receiving and storing files correctly.

### Step 1: Access Blossom Server Settings

1. Open Cypher Log in your browser
2. Click the **three-dot menu** (⋮) in the top-right corner
3. Select **"Server Settings"** from the dropdown
4. Click on the **"Media Servers"** tab

You should now see your list of configured Blossom servers.

### Step 2: Test Your Synology Server

1. Find your Synology NAS server in the list (it should be marked with a 🔒 **Private** badge if configured correctly)
2. Click the **upload icon** (↑) button next to your Synology server
3. Watch the console logs and the test result that appears below the server

**What to expect:**

- **Green "Upload successful!" message**: Your Synology server is working! ✓
  - The full file URL will be displayed
  - Check this URL on your NAS to verify the file exists
  
- **Red "Upload failed" message**: There's a problem ✗
  - The error message will help diagnose the issue
  - Common errors are listed below

### Step 3: Verify on Your NAS

After a successful test upload:

1. SSH into your Synology NAS or use File Station
2. Navigate to your Blossom server's storage directory
3. Look for a file matching the hash shown in the uploaded URL
4. The test file is a tiny 1x1 pixel transparent PNG (about 68 bytes)

### Common Issues and Solutions

#### Issue 1: "All uploads failed" when uploading normally

**Cause**: Files are being uploaded to public servers (like blossom.primal.net) instead of your private Synology server.

**Solution**: 
1. Make sure your Synology server is marked as **"Private"** (🔒 badge)
2. Toggle the "Private Server" switch in the server settings
3. Only servers marked as "Private" are used for actual file uploads

#### Issue 2: Server shows red dot (not reachable)

**Cause**: Network connectivity issue

**Solutions**:
- Verify the server URL is correct (should include `https://` and end with `/`)
- Check firewall rules on your Synology NAS
- Verify SSL certificate is valid
- Try accessing the Blossom server URL directly in your browser

#### Issue 3: Upload test fails with authentication error

**Cause**: Blossom server authentication not configured correctly

**Solutions**:
- Verify your Nostr public key is authorized on the Blossom server
- Check Blossom server logs on your Synology for authentication errors
- Ensure the Blossom server is configured to accept uploads from your npub

#### Issue 4: CORS errors in browser console

**Cause**: Blossom server not configured for CORS

**Solution**:
- Add CORS headers to your Blossom server configuration:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, HEAD, OPTIONS
  Access-Control-Allow-Headers: Authorization, Content-Type
  ```

### Understanding Upload Behavior

The `useUploadFile` hook attempts to upload to **ALL enabled private servers** in parallel:

1. Each private server gets the file simultaneously
2. If at least one upload succeeds, the hook returns successfully
3. The returned URL comes from the first successful upload
4. Failed uploads are logged to the console

**This means:**
- Files are redundantly stored across all private servers (good for backup!)
- If your Synology upload fails but another private server succeeds, you won't see an error
- Check the browser console for detailed upload logs showing which servers succeeded/failed

### Viewing Detailed Upload Logs

Open your browser's Developer Console (F12) and look for these log messages:

```
[Upload] Starting upload to configured servers
[Upload] Using BlossomUploader
[Upload] Complete: X/Y servers succeeded
[Upload] Success
```

Failed uploads will show:
```
[BlossomTest] ✗ Failed to upload to https://your-nas-url/: [error message]
```

Successful uploads will show:
```
[BlossomTest] ✓ Success! File uploaded to: https://your-nas-url/[hash].png
```

### Recommended Server Configuration

For best results:

1. **At least one private server** (your Synology NAS)
2. **One public server** marked as NOT private (for fallback/redundancy)
3. **All servers should show green dot** (reachable)
4. **Private servers should have 🔒 badge**

### Testing Checklist

- [ ] Synology server URL is correct and ends with `/`
- [ ] Server shows green connectivity indicator
- [ ] Server is marked as "Private" (🔒 badge)
- [ ] Server is "Enabled" (toggle switch on)
- [ ] Test upload button shows success ✓
- [ ] Uploaded file exists on Synology NAS
- [ ] Browser console shows successful upload logs
- [ ] Regular file uploads (receipts, photos) work correctly

### Getting Help

If you're still having issues after following these steps, check:

1. **Synology Blossom server logs** - Look for authentication or storage errors
2. **Browser console logs** - Press F12 and check for detailed error messages
3. **Network tab** - Verify requests are being sent to your Synology server
4. **Firewall/Router logs** - Ensure traffic is reaching your NAS

### Quick Fix: Marking a Server as Private

If you have a server configured but uploads aren't going to it:

1. Open Server Settings → Media Servers
2. Find your Synology server in the list
3. Click the settings icon (⚙️) next to it
4. Toggle **"Private Server"** to ON (should turn amber/orange)
5. Now try uploading a file in the app

Only servers marked as "Private" are used for actual file uploads. This prevents sensitive data (receipts, documents, photos) from being uploaded to public servers you don't control.

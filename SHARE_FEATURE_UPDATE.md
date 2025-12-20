# Share Feature Update

## Changes Implemented

### Enhanced Share Location Functionality
The "Share Location" feature on the Home Screen has been significantly improved to provide more detailed and useful information.

### 1. Detailed Message Format
The shared message now includes:
- **Full Address**: Street, Name, District, City, Region, Postal Code, Country.
- **Precise Coordinates**: Latitude and Longitude with accuracy.
- **Map Link**: A direct link to Google Maps.

### 2. Web Compatibility
- Improved address geocoding on Web (using OpenStreetMap Nominatim) to include `district` and `subregion` fields, matching the native experience.
- Added a robust fallback mechanism for Web sharing:
  1. Tries the modern `navigator.clipboard` API.
  2. Falls back to `document.execCommand('copy')` with a hidden textarea.
  3. Displays the message in an Alert if all else fails.

### 3. Native Sharing
- Uses the native `Share.share` API on iOS and Android.
- Includes a subject line for emails.
- Provides a URL parameter for better integration with iOS sharing sheet.

## Files Modified
- `screens/main/HomeScreen.tsx`: Updated `shareLocation` and `getAddressFromLocation` functions.

## Testing
- **Web**: Verify that clicking "Share Location" copies the detailed message to the clipboard.
- **Mobile**: Verify that clicking "Share Location" opens the system share sheet with the pre-filled message and link.

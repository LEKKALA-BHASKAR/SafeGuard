# SafeGuard - Audio Files

This directory contains audio files for the fake call feature:

- **ringtone.mp3**: Default ringtone for incoming fake calls
- **conversation.mp3**: Pre-recorded fake conversation audio

## Production Setup

Replace these placeholder files with actual audio files:

1. **Ringtone Requirements**:
   - Format: MP3
   - Duration: 15-30 seconds (looping)
   - Bitrate: 128kbps
   - Sample rate: 44.1kHz

2. **Conversation Requirements**:
   - Format: MP3
   - Duration: 1-3 minutes
   - Content: Natural-sounding one-sided conversation
   - Examples: 
     * "Hey, are you okay? I need you to come pick me up..."
     * "Hi Mom, yeah I can talk. What's up?"
     * "This is important, can you come get me?"

## Free Audio Resources

- **FreeSound.org**: Free sound effects and ringtones
- **Incompetech.com**: Royalty-free audio
- **ZapSplat.com**: Free sound effects library

## Note

For demo purposes, the app will gracefully handle missing audio files.
In production, ensure all audio files are present and properly licensed.

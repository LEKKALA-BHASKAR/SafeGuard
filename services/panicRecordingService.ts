import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import { File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { getAuth } from 'firebase/auth';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';

export interface RecordingSession {
  id: string;
  type: 'audio' | 'video';
  startTime: number;
  duration: number;
  fileUri?: string;
  cloudUrl?: string;
  status: 'recording' | 'stopped' | 'uploading' | 'uploaded' | 'failed';
}

class PanicRecordingService {
  private audioRecording: Audio.Recording | null = null;
  private isRecordingAudio = false;
  private activeSessions: Map<string, RecordingSession> = new Map();

  // Initialize permissions
  async initialize(): Promise<boolean> {
    try {
      // Audio permissions
      const audioStatus = await Audio.requestPermissionsAsync();
      if (audioStatus.status !== 'granted') {
        console.error('Audio permission denied');
        return false;
      }

      // Camera permissions
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        console.error('Camera permission denied');
        return false;
      }

      // Microphone permissions for video
      const microphoneStatus = await Camera.requestMicrophonePermissionsAsync();
      if (microphoneStatus.status !== 'granted') {
        console.error('Microphone permission denied');
      }

      // Media library permissions for saving
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      if (mediaStatus.status !== 'granted') {
        console.warn('Media library permission denied - files will not be saved locally');
      }

      return true;
    } catch (error) {
      console.error('Error initializing panic recording:', error);
      return false;
    }
  }

  // Start audio recording
  async startAudioRecording(): Promise<string | null> {
    if (this.isRecordingAudio) {
      console.warn('Audio recording already in progress');
      return null;
    }

    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      // Create recording
      this.audioRecording = new Audio.Recording();
      await this.audioRecording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });

      await this.audioRecording.startAsync();
      this.isRecordingAudio = true;

      const sessionId = Date.now().toString();
      const session: RecordingSession = {
        id: sessionId,
        type: 'audio',
        startTime: Date.now(),
        duration: 0,
        status: 'recording',
      };

      this.activeSessions.set(sessionId, session);

      console.log('Audio recording started');
      return sessionId;
    } catch (error) {
      console.error('Error starting audio recording:', error);
      return null;
    }
  }

  // Stop audio recording
  async stopAudioRecording(sessionId: string): Promise<string | null> {
    if (!this.audioRecording || !this.isRecordingAudio) {
      return null;
    }

    try {
      await this.audioRecording.stopAndUnloadAsync();
      const uri = this.audioRecording.getURI();
      this.audioRecording = null;
      this.isRecordingAudio = false;

      const session = this.activeSessions.get(sessionId);
      if (session && uri) {
        session.fileUri = uri;
        session.status = 'stopped';
        session.duration = Date.now() - session.startTime;

        // Auto-upload to cloud
        this.uploadToCloud(sessionId);
      }

      console.log('Audio recording stopped:', uri);
      return uri;
    } catch (error) {
      console.error('Error stopping audio recording:', error);
      return null;
    }
  }

  // Upload recording to Firebase Storage
  private async uploadToCloud(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.fileUri) {
      return;
    }

    try {
      session.status = 'uploading';

      const auth = getAuth();
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Read file as blob (File class implements Blob interface)
      // session.fileUri is a file:// URI from Audio.Recording.getURI()
      // The File constructor accepts URIs as strings
      const file = new File(session.fileUri);
      const blob = file.slice(0, file.size, 'audio/m4a');

      // Upload to Firebase Storage
      const storage = getStorage();
      const filename = `panic_recordings/${auth.currentUser.uid}/${sessionId}.m4a`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);

      session.cloudUrl = downloadUrl;
      session.status = 'uploaded';

      console.log('Recording uploaded to cloud:', downloadUrl);
    } catch (error) {
      console.error('Error uploading to cloud:', error);
      session.status = 'failed';
    }
  }

  // Get recording status
  getRecordingStatus(sessionId: string): RecordingSession | null {
    return this.activeSessions.get(sessionId) || null;
  }

  // Get all sessions
  getAllSessions(): RecordingSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Delete local recording
  async deleteLocalRecording(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    
    if (!session || !session.fileUri) {
      return false;
    }

    try {
      // session.fileUri is a file:// URI from Audio.Recording.getURI()
      // The File constructor accepts URIs as strings
      const file = new File(session.fileUri);
      await file.delete();
      this.activeSessions.delete(sessionId);
      return true;
    } catch (error) {
      console.error('Error deleting recording:', error);
      return false;
    }
  }

  // Emergency: Start recording everything
  async startEmergencyRecording(): Promise<{
    audioSessionId: string | null;
  }> {
    console.log('🚨 EMERGENCY RECORDING ACTIVATED');

    const audioSessionId = await this.startAudioRecording();

    // Note: Video recording requires camera component integration
    // This can be implemented as a future enhancement when camera UI is added

    return {
      audioSessionId,
    };
  }

  // Stop all recordings
  async stopAllRecordings(): Promise<void> {
    for (const [sessionId, session] of this.activeSessions) {
      if (session.status === 'recording') {
        if (session.type === 'audio') {
          await this.stopAudioRecording(sessionId);
        }
      }
    }
  }
}

const panicRecordingService = new PanicRecordingService();
export default panicRecordingService;

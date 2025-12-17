import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface WebCommunicationFallbackProps {
  phoneNumber: string;
  message: string;
  userName?: string;
}

/**
 * Web-optimized communication component
 * Provides fallback UI for SMS and phone calls on web platform
 */
export default function WebCommunicationFallback({
  phoneNumber,
  message,
  userName = 'contact',
}: WebCommunicationFallbackProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMessage = async () => {
    try {
      await Clipboard.setString(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      // Show feedback
      if (typeof window !== 'undefined' && 'alert' in window) {
        alert('Message copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleCopyPhone = async () => {
    try {
      await Clipboard.setString(phoneNumber);
      if (typeof window !== 'undefined' && 'alert' in window) {
        alert('Phone number copied to clipboard!');
      }
    } catch (error) {
      console.error('Failed to copy phone number:', error);
    }
  };

  const handleShareMessage = async () => {
    try {
      await Share.share({
        message: `${message}\n\nTo: ${userName} (${phoneNumber})`,
        title: 'Emergency Alert',
      });
    } catch (error) {
      console.error('Error sharing message:', error);
    }
  };

  const handleOpenEmail = () => {
    // Try to open default email client
    const emailUrl = `mailto:?subject=Emergency Alert&body=${encodeURIComponent(message)}`;
    Linking.openURL(emailUrl).catch(err => console.error('Failed to open email:', err));
  };

  const handleOpenWhatsApp = () => {
    // Open WhatsApp Web
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(whatsappUrl).catch(err => console.error('Failed to open WhatsApp:', err));
  };

  const handleOpenTelegram = () => {
    // Open Telegram Web
    const telegramUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(message)}`;
    Linking.openURL(telegramUrl).catch(err => console.error('Failed to open Telegram:', err));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="information-circle" size={24} color="#FF9800" />
        <Text style={styles.headerText}>
          Web Platform - Use alternative communication
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.label}>Contact</Text>
        <Text style={styles.value}>{userName}</Text>
        
        <View style={styles.phoneRow}>
          <Text style={styles.value}>{phoneNumber}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyPhone}>
            <Ionicons name="copy-outline" size={18} color="#E63946" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.messageCard}>
        <Text style={styles.label}>Message</Text>
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.copyMessageButton, copied && styles.copiedButton]}
          onPress={handleCopyMessage}
        >
          <Ionicons name={copied ? "checkmark" : "copy"} size={20} color="#fff" />
          <Text style={styles.actionButtonText}>
            {copied ? 'Copied!' : 'Copy Message'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Send via:</Text>

      <View style={styles.optionsGrid}>
        <TouchableOpacity style={styles.optionButton} onPress={handleShareMessage}>
          <View style={[styles.optionIcon, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="share-social" size={24} color="#fff" />
          </View>
          <Text style={styles.optionText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton} onPress={handleOpenWhatsApp}>
          <View style={[styles.optionIcon, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          </View>
          <Text style={styles.optionText}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton} onPress={handleOpenEmail}>
          <View style={[styles.optionIcon, { backgroundColor: '#EA4335' }]}>
            <Ionicons name="mail" size={24} color="#fff" />
          </View>
          <Text style={styles.optionText}>Email</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton} onPress={handleOpenTelegram}>
          <View style={[styles.optionIcon, { backgroundColor: '#0088cc' }]}>
            <Ionicons name="paper-plane" size={24} color="#fff" />
          </View>
          <Text style={styles.optionText}>Telegram</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.helpCard}>
        <Ionicons name="help-circle-outline" size={20} color="#666" />
        <Text style={styles.helpText}>
          On web, you can copy the message and phone number to send via your preferred messaging app
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
    fontSize: 14,
    color: '#F57C00',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  copyButton: {
    padding: 8,
  },
  messageCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  messageBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 8,
  },
  copyMessageButton: {
    backgroundColor: '#E63946',
  },
  copiedButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  optionButton: {
    alignItems: 'center',
    width: '22%',
    minWidth: 80,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  helpCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});

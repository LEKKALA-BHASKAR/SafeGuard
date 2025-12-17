import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import fakeCallService from '../../services/fakeCallService';

interface FakeCallConfig {
  callerName: string;
  callerNumber: string;
  delaySeconds: number;
  ringtoneUri?: string;
  vibrate: boolean;
}

interface FakeCallScreenProps {
  userId: string;
}

export default function FakeCallScreen({ userId }: FakeCallScreenProps) {
  const [selectedCaller, setSelectedCaller] = useState<any>(null);
  const [delayMinutes, setDelayMinutes] = useState('2');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledCallId, setScheduledCallId] = useState<string | null>(null);
  const [showCustomCallerModal, setShowCustomCallerModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState('');
  const [customCallers, setCustomCallers] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<any>(null);

  useEffect(() => {
    loadCustomCallers();
    checkActiveCall();
  }, []);

  const loadCustomCallers = async () => {
    const callers = await fakeCallService.getCustomCallers();
    setCustomCallers(callers);
  };

  const checkActiveCall = async () => {
    const call = await fakeCallService.getActiveCall();
    setActiveCall(call);
  };

  const handleScheduleCall = async () => {
    if (!selectedCaller) {
      Alert.alert('No Caller Selected', 'Please select a caller for the fake call.');
      return;
    }

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const delaySeconds = parseInt(delayMinutes) * 60;
      const config: FakeCallConfig = {
        callerName: selectedCaller.name,
        callerNumber: selectedCaller.number,
        delaySeconds,
        vibrate: true,
      };

      const callId = await fakeCallService.scheduleFakeCall(config);
      setScheduledCallId(callId);
      setIsScheduled(true);

      Alert.alert(
        'Fake Call Scheduled',
        `You will receive a fake call from "${selectedCaller.name}" in ${delayMinutes} minute(s).`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error scheduling fake call:', error);
      Alert.alert('Error', 'Failed to schedule fake call. Please try again.');
    }
  };

  const handleQuickCall = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await fakeCallService.triggerQuickFakeCall();
      
      Alert.alert(
        'Quick Call Starting',
        'Fake call will ring in 2 seconds...',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error triggering quick call:', error);
    }
  };

  const handleCancelScheduled = async () => {
    try {
      await fakeCallService.cancelScheduledCall();
      setIsScheduled(false);
      setScheduledCallId(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Cancelled', 'Scheduled fake call has been cancelled.');
    } catch (error) {
      console.error('Error cancelling call:', error);
    }
  };

  const handleAnswerCall = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await fakeCallService.answerFakeCall();
      checkActiveCall();
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const handleEndCall = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await fakeCallService.endFakeCall();
      setActiveCall(null);
    } catch (error) {
      console.error('Error ending call:', error);
    }
  };

  const handleSaveCustomCaller = async () => {
    if (!customName.trim() || !customNumber.trim()) {
      Alert.alert('Invalid Input', 'Please enter both name and number.');
      return;
    }

    try {
      await fakeCallService.saveCustomCaller(customName, customNumber);
      await loadCustomCallers();
      setShowCustomCallerModal(false);
      setCustomName('');
      setCustomNumber('');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert('Success', 'Custom caller saved successfully!');
    } catch (error) {
      console.error('Error saving custom caller:', error);
      Alert.alert('Error', 'Failed to save custom caller.');
    }
  };

  const presetCallers = fakeCallService.getPresetCallers();
  const allCallers = [...presetCallers, ...customCallers];

  // If there's an active call, show call screen
  if (activeCall && activeCall.active) {
    return (
      <View style={styles.callScreen}>
        <View style={styles.callHeader}>
          <Text style={styles.callStatus}>
            {activeCall.answered ? 'In Call' : 'Incoming Call'}
          </Text>
          {activeCall.answered && (
            <Text style={styles.callDuration}>
              {Math.floor((Date.now() - activeCall.answerTime) / 1000)}s
            </Text>
          )}
        </View>

        <View style={styles.callContent}>
          <View style={styles.callerAvatar}>
            <Ionicons name="person" size={80} color="#fff" />
          </View>
          <Text style={styles.callerName}>{activeCall.callerName}</Text>
          <Text style={styles.callerNumber}>{activeCall.callerNumber}</Text>
        </View>

        <View style={styles.callActions}>
          {!activeCall.answered ? (
            <>
              <TouchableOpacity
                style={[styles.callButton, styles.answerButton]}
                onPress={handleAnswerCall}
              >
                <Ionicons name="call" size={32} color="#fff" />
                <Text style={styles.callButtonText}>Answer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.callButton, styles.declineButton]}
                onPress={handleEndCall}
              >
                <Ionicons name="close" size={32} color="#fff" />
                <Text style={styles.callButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.callButton, styles.endButton]}
              onPress={handleEndCall}
            >
              <Ionicons name="call" size={32} color="#fff" />
              <Text style={styles.callButtonText}>End Call</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.fakeCallBadge}>
          <Text style={styles.fakeCallBadgeText}>🎭 Fake Call</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Normal screen
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="call-outline" size={40} color="#E63946" />
          </View>
          <Text style={styles.title}>Fake Call Escape</Text>
          <Text style={styles.subtitle}>
            Schedule a fake call to help you escape uncomfortable situations safely
          </Text>
        </View>

        {isScheduled && (
          <View style={styles.scheduledBanner}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={styles.scheduledInfo}>
              <Text style={styles.scheduledTitle}>Call Scheduled</Text>
              <Text style={styles.scheduledText}>
                {selectedCaller?.name} will call you in {delayMinutes} minute(s)
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancelScheduled}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.quickCallButton}
            onPress={handleQuickCall}
          >
            <Ionicons name="flash" size={24} color="#fff" />
            <View style={styles.quickCallText}>
              <Text style={styles.quickCallTitle}>Emergency Quick Call</Text>
              <Text style={styles.quickCallSubtitle}>Rings in 2 seconds</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Caller</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCustomCallerModal(true)}
            >
              <Ionicons name="add-circle" size={24} color="#E63946" />
              <Text style={styles.addButtonText}>Custom</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.callersGrid}>
            {allCallers.map((caller, index) => (
              <TouchableOpacity
                key={`${caller.name}-${index}`}
                style={[
                  styles.callerCard,
                  selectedCaller?.name === caller.name && styles.callerCardSelected
                ]}
                onPress={() => {
                  setSelectedCaller(caller);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[
                  styles.callerIcon,
                  selectedCaller?.name === caller.name && styles.callerIconSelected
                ]}>
                  <Ionicons
                    name={
                      caller.type === 'family' ? 'heart' :
                      caller.type === 'work' ? 'briefcase' :
                      caller.type === 'professional' ? 'medical' :
                      'person'
                    }
                    size={24}
                    color={selectedCaller?.name === caller.name ? '#fff' : '#666'}
                  />
                </View>
                <Text style={[
                  styles.callerName,
                  selectedCaller?.name === caller.name && styles.callerNameSelected
                ]}>
                  {caller.name}
                </Text>
                <Text style={styles.callerType}>
                  {caller.type || 'custom'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delay Time</Text>
          <View style={styles.delayOptions}>
            {['1', '2', '5', '10', '15'].map((minutes) => (
              <TouchableOpacity
                key={minutes}
                style={[
                  styles.delayButton,
                  delayMinutes === minutes && styles.delayButtonSelected
                ]}
                onPress={() => {
                  setDelayMinutes(minutes);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.delayButtonText,
                  delayMinutes === minutes && styles.delayButtonTextSelected
                ]}>
                  {minutes}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.customDelayInput}
            placeholder="Custom delay (minutes)"
            value={delayMinutes}
            onChangeText={setDelayMinutes}
            keyboardType="number-pad"
            placeholderTextColor="#999"
          />
        </View>

        <TouchableOpacity
          style={[styles.scheduleButton, isScheduled && styles.scheduleButtonDisabled]}
          onPress={handleScheduleCall}
          disabled={isScheduled}
        >
          <Ionicons name="time-outline" size={24} color="#fff" />
          <Text style={styles.scheduleButtonText}>
            {isScheduled ? 'Call Scheduled' : 'Schedule Fake Call'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
          <View style={styles.infoText}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoDescription}>
              • Select a caller and delay time{'\n'}
              • The phone will ring like a real call{'\n'}
              • Answer to play a fake conversation{'\n'}
              • Politely excuse yourself from the situation
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Custom Caller Modal */}
      <Modal
        visible={showCustomCallerModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCustomCallerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Caller</Text>
              <TouchableOpacity onPress={() => setShowCustomCallerModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Caller Name"
              value={customName}
              onChangeText={setCustomName}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Phone Number"
              value={customNumber}
              onChangeText={setCustomNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSaveCustomCaller}
            >
              <Text style={styles.modalButtonText}>Save Caller</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scheduledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  scheduledInfo: {
    flex: 1,
  },
  scheduledTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  scheduledText: {
    fontSize: 14,
    color: '#558B2F',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E63946',
  },
  quickCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    padding: 20,
    borderRadius: 12,
    gap: 16,
  },
  quickCallText: {
    flex: 1,
  },
  quickCallTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  quickCallSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  callersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  callerCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  callerCardSelected: {
    borderColor: '#E63946',
    backgroundColor: '#FFE5E7',
  },
  callerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  callerIconSelected: {
    backgroundColor: '#E63946',
  },
  callerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  callerNameSelected: {
    color: '#E63946',
  },
  callerType: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 2,
  },
  delayOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  delayButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  delayButtonSelected: {
    borderColor: '#E63946',
    backgroundColor: '#FFE5E7',
  },
  delayButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  delayButtonTextSelected: {
    color: '#E63946',
  },
  customDelayInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  scheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E63946',
    padding: 18,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
  },
  scheduleButtonDisabled: {
    backgroundColor: '#999',
  },
  scheduleButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  infoDescription: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
  },
  modalButton: {
    backgroundColor: '#E63946',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  // Call Screen Styles
  callScreen: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  callHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  callStatus: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.8,
  },
  callDuration: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 8,
  },
  callContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callerAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  callActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    padding: 40,
  },
  callButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    backgroundColor: '#F44336',
  },
  endButton: {
    backgroundColor: '#F44336',
  },
  callButtonText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  fakeCallBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fakeCallBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

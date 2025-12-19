import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  AnimatableNumericValue,
  AnimatableStringValue,
  BlendMode,
  BoxShadowValue,
  ColorValue,
  CursorValue,
  DimensionValue,
  FilterFunction,
  FlatList,
  FlexAlignType,
  FontVariant,
  GradientValue,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import firebaseContactsService, { EmergencyContact as EnhancedEmergencyContact } from '../../services/firebaseContactsService';
import otpService from '../../services/otpService';
import { getTheme } from '../../constants/theme';

// Re-exporting for other components to use
export type { EnhancedEmergencyContact };

interface ContactsScreenProps {
  onContactsChange?: (contacts: EnhancedEmergencyContact[]) => void;
}

export default function EnhancedContactsScreen({ onContactsChange }: ContactsScreenProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme === 'dark');
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [contacts, setContacts] = useState<EnhancedEmergencyContact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EnhancedEmergencyContact | null>(null);
  const [verifyingContact, setVerifyingContact] = useState<EnhancedEmergencyContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  
  // Search & Refresh state
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Import state
  const [deviceContacts, setDeviceContacts] = useState<Contacts.Contact[]>([]);
  const [importModalVisible, setImportModalVisible] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationship, setRelationship] = useState('');
  const [role, setRole] = useState<'primary' | 'secondary' | 'tertiary'>('secondary');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    initializeContacts();
  }, []);

  const initializeContacts = async () => {
    try {
      // Initialize Firebase contacts service (auto-migrates from local storage)
      await firebaseContactsService.initialize();
      await loadContacts();
    } catch (error) {
      console.error('Error initializing contacts:', error);
      Alert.alert('Initialization Error', 'Failed to initialize contacts service');
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const firebaseContacts = await firebaseContactsService.getUserContacts();
      setContacts(firebaseContacts);
      onContactsChange?.(firebaseContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
      Alert.alert('Error', 'Failed to load contacts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadContacts();
  };

  const saveContact = async (contact: Partial<EnhancedEmergencyContact>, isUpdate: boolean = false) => {
    try {
      if (isUpdate && contact.id) {
        await firebaseContactsService.updateContact(contact.id, contact);
      } else {
        await firebaseContactsService.addContact(contact as Omit<EnhancedEmergencyContact, 'id' | 'userId'>);
      }
      await loadContacts(); // Reload to get latest from Firebase
    } catch (error) {
      console.error('Error saving contact:', error);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
      throw error;
    }
  };

  const openAddContactModal = () => {
    setEditingContact(null);
    setName('');
    setPhoneNumber('');
    setRelationship('');
    setRole('secondary');
    setEmail('');
    setNotes('');
    setModalVisible(true);
  };

  const openEditContactModal = (contact: EnhancedEmergencyContact) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setEditingContact(contact);
    setName(contact.name);
    setPhoneNumber(contact.phoneNumber);
    setRelationship(contact.relationship);
    setRole(contact.role);
    setEmail(contact.email || '');
    setNotes(contact.notes || '');
    setModalVisible(true);
  };

  const handleSaveContact = () => {
    if (!name || !phoneNumber || !relationship) {
      Alert.alert(t('error'), 'Please fill in all required fields');
      return;
    }

    // Validate phone number
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s-()]/g, ''))) {
      Alert.alert(t('error'), 'Please enter a valid phone number with country code (e.g., +1234567890)');
      return;
    }

    // Check if primary contact already exists
    if (role === 'primary' && (!editingContact || editingContact.role !== 'primary')) {
      const hasPrimary = contacts.some(c => c.role === 'primary');
      if (hasPrimary) {
        Alert.alert(
          'Primary Contact Exists',
          'You already have a primary contact. Do you want to replace it?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Replace',
              onPress: () => {
                // Demote existing primary to secondary
                // Ideally this should be handled by the service or backend, but for now we can do it here or just proceed and let the service handle it if it enforces uniqueness
                saveNewContact();
              },
            },
          ]
        );
        return;
      }
    }

    saveNewContact();
  };

  const saveNewContact = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      const contactData = {
        name,
        phoneNumber,
        relationship,
        role,
        email,
        notes,
        verified: editingContact ? editingContact.verified : false,
        favorite: editingContact ? editingContact.favorite : false,
      };

      if (editingContact) {
        await saveContact({ ...editingContact, ...contactData }, true);
      } else {
        await saveContact(contactData, false);
      }

      setModalVisible(false);
    } catch (error) {
      console.error('Error in saveNewContact:', error);
      // Modal stays open so user can retry
    }
  };

  const handleDeleteContact = (contact: EnhancedEmergencyContact) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              await firebaseContactsService.deleteContact(contact.id);
              await loadContacts();
            } catch (error) {
              console.error('Error deleting contact:', error);
              Alert.alert('Error', 'Failed to delete contact. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleVerifyContact = (contact: EnhancedEmergencyContact) => {
    setVerifyingContact(contact);
    setOtpCode('');
    setOtpSent(false);
    setVerifyModalVisible(true);
  };

  const handleSendVerificationOTP = async () => {
    if (!verifyingContact) return;

    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const result = await otpService.sendOTP(verifyingContact.phoneNumber, 'verification');
      
      if (result.success) {
        setOtpSent(true);
        Alert.alert(t('success'), result.message);
      } else {
        Alert.alert(t('error'), result.message);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      Alert.alert(t('error'), 'Failed to send verification code');
    }
  };

  const handleVerifyOTP = async () => {
    if (!verifyingContact || !otpCode) return;

    try {
      setVerifying(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      
      const result = await otpService.verifyOTP(verifyingContact.phoneNumber, otpCode);
      
      if (result.success) {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Update contact verification status in Firebase
        await firebaseContactsService.markContactAsVerified(
          verifyingContact.id,
          verifyingContact.phoneNumber
        );
        await loadContacts();
        
        setVerifyModalVisible(false);
        Alert.alert(t('success'), 'Contact verified successfully!');
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert(t('error'), result.message);
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      Alert.alert(t('error'), 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleToggleFavorite = async (contact: EnhancedEmergencyContact) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      await firebaseContactsService.toggleFavorite(contact.id, !contact.favorite);
      await loadContacts();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status.');
    }
  };

  const handleImportFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('error'), 'Permission to access contacts is required');
        return;
      }

      setImporting(true);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
      });

      if (data.length > 0) {
        // Filter contacts that have phone numbers
        const validContacts = data.filter(c => c.phoneNumbers && c.phoneNumbers.length > 0);
        setDeviceContacts(validContacts.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        setImportModalVisible(true);
      } else {
        Alert.alert('No Contacts', 'No contacts found on your device.');
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      Alert.alert(t('error'), 'Failed to import contacts');
    } finally {
      setImporting(false);
    }
  };

  const handleSelectDeviceContact = (contact: Contacts.Contact) => {
    setImportModalVisible(false);
    
    // Extract details
    const contactName = contact.name || '';
    const contactPhone = contact.phoneNumbers?.[0]?.number || '';
    const contactEmail = contact.emails?.[0]?.email || '';
    
    // Pre-fill add modal
    setEditingContact(null);
    setName(contactName);
    setPhoneNumber(contactPhone);
    setRelationship('');
    setRole('secondary');
    setEmail(contactEmail);
    setNotes('');
    
    // Open add modal after a short delay to allow import modal to close
    setTimeout(() => {
      setModalVisible(true);
    }, 500);
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleMessage = (phoneNumber: string) => {
    Linking.openURL(`sms:${phoneNumber}`);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'primary': return '#FFE0E0';
      case 'secondary': return '#E0F0FF';
      default: return '#F0F0F0';
    }
  };

  const renderContact = ({ item }: { item: EnhancedEmergencyContact }) => (
    <View style={styles.contactCard}>
      <TouchableOpacity
        style={styles.contactContent}
        onPress={() => openEditContactModal(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={[styles.avatar, !item.verified && styles.avatarUnverified]}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>

        {/* Contact Info */}
        <View style={styles.contactInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.contactName}>{item.name}</Text>
            {item.favorite && <Text style={styles.favoriteIcon}>⭐</Text>}
          </View>
          
          <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
          <Text style={styles.contactRelationship}>{item.relationship}</Text>
          
          {/* Role Badge */}
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleBadgeText}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
        </View>

        {/* Status Icons */}
        <View style={styles.contactActions}>
          <TouchableOpacity
            onPress={() => handleToggleFavorite(item)}
            style={styles.actionButton}
          >
            <Text style={styles.actionIcon}>{item.favorite ? '⭐' : '☆'}</Text>
          </TouchableOpacity>
          
          {item.verified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => handleVerifyContact(item)}
              style={styles.verifyButton}
            >
              <Text style={styles.verifyButtonText}>Verify</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteContact(item)}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity 
          style={styles.quickActionBtn} 
          onPress={() => handleCall(item.phoneNumber)}
        >
          <Text style={styles.quickActionIcon}>📞</Text>
          <Text style={styles.quickActionText}>Call</Text>
        </TouchableOpacity>
        
        <View style={styles.verticalDivider} />
        
        <TouchableOpacity 
          style={styles.quickActionBtn} 
          onPress={() => handleMessage(item.phoneNumber)}
        >
          <Text style={styles.quickActionIcon}>💬</Text>
          <Text style={styles.quickActionText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
        <Text style={styles.loadingText}>Loading contacts...</Text>
      </View>
    );
  }

  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phoneNumber.includes(searchQuery) ||
    contact.relationship.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Contacts</Text>
        <Text style={styles.headerSubtitle}>
          {contacts.length} {contacts.length === 1 ? 'contact' : 'contacts'} added
        </Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Contacts List */}
      {filteredContacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>{searchQuery ? '🔍' : '👥'}</Text>
          <Text style={styles.emptyTitle}>{searchQuery ? 'No Results Found' : 'No Emergency Contacts'}</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? `No contacts matching "${searchQuery}"` : 'Add trusted contacts who will be notified during emergencies'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts.sort((a, b) => {
            // Sort: favorites first, then by role, then by name
            if (a.favorite && !b.favorite) return -1;
            if (!a.favorite && b.favorite) return 1;
            
            const roleOrder = { primary: 0, secondary: 1, tertiary: 2 };
            if (roleOrder[a.role] !== roleOrder[b.role]) {
              return roleOrder[a.role] - roleOrder[b.role];
            }
            
            return a.name.localeCompare(b.name);
          })}
          renderItem={renderContact}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E63946" />
          }
        />
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.importBtn]}
          onPress={handleImportFromContacts}
          disabled={importing}
        >
          {importing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.actionBtnIcon}>📱</Text>
              <Text style={styles.actionBtnText}>Import</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.addBtn]}
          onPress={openAddContactModal}
        >
          <Text style={styles.actionBtnIcon}>+</Text>
          <Text style={styles.actionBtnText}>Add Contact</Text>
        </TouchableOpacity>
      </View>

      {/* Add/Edit Contact Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Full name"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="+1234567890"
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Relationship *</Text>
              <TextInput
                style={styles.input}
                value={relationship}
                onChangeText={setRelationship}
                placeholder="e.g., Mother, Friend, Colleague"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Role *</Text>
              <View style={styles.roleSelector}>
                {(['primary', 'secondary', 'tertiary'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleOption, role === r && styles.roleOptionSelected]}
                    onPress={() => setRole(r)}
                  >
                    <Text style={[styles.roleOptionText, role === r && styles.roleOptionTextSelected]}>
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Additional information..."
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.saveBtn]}
                  onPress={handleSaveContact}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Verify Contact Modal */}
      <Modal
        visible={verifyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.verifyModalContent}>
            <Text style={styles.modalTitle}>Verify Contact</Text>
            <Text style={styles.verifySubtitle}>
              {verifyingContact?.name}
            </Text>
            <Text style={styles.verifyPhone}>
              {verifyingContact?.phoneNumber}
            </Text>

            {!otpSent ? (
              <>
                <Text style={styles.verifyDescription}>
                  We'll send a verification code to this number
                </Text>
                <TouchableOpacity
                  style={styles.sendOtpBtn}
                  onPress={handleSendVerificationOTP}
                >
                  <Text style={styles.sendOtpBtnText}>Send Verification Code</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.otpLabel}>Enter 6-digit code</Text>
                <TextInput
                  style={styles.otpInput}
                  value={otpCode}
                  onChangeText={setOtpCode}
                  placeholder="000000"
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholderTextColor="#999"
                />
                
                <TouchableOpacity
                  style={styles.verifyOtpBtn}
                  onPress={handleVerifyOTP}
                  disabled={verifying}
                >
                  {verifying ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.verifyOtpBtnText}>Verify Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleSendVerificationOTP}>
                  <Text style={styles.resendText}>Resend Code</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setVerifyModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Import Contacts Modal */}
      <Modal
        visible={importModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setImportModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Select Contact</Text>
            <TouchableOpacity 
              onPress={() => setImportModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={deviceContacts}
            keyExtractor={(item, index) => item.phoneNumbers?.[0]?.number || `contact-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.importContactItem}
                onPress={() => handleSelectDeviceContact(item)}
              >
                <View style={styles.importAvatar}>
                  <Text style={styles.importAvatarText}>
                    {(item.name || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.importInfo}>
                  <Text style={styles.importName}>{item.name || 'Unknown'}</Text>
                  <Text style={styles.importPhone}>
                    {item.phoneNumbers?.[0]?.number || 'No number'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  flatList: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#E63946',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginTop: 16,
    height: 44,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  contactContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E63946',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarUnverified: {
    backgroundColor: '#999',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  contactInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  favoriteIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  contactPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  contactActions: {
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 20,
  },
  verifiedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  quickActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  quickActionIcon: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  importBtn: {
    backgroundColor: '#2196F3',
  },
  addBtn: {
    backgroundColor: '#E63946',
  },
  actionBtnIcon: {
    fontSize: 20,
    color: '#fff',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  verifyModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  verifySubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  verifyPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  verifyDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: '#E63946',
    backgroundColor: '#FFE0E0',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  roleOptionTextSelected: {
    color: '#E63946',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F0F0F0',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveBtn: {
    backgroundColor: '#E63946',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sendOtpBtn: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendOtpBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  otpInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    borderWidth: 2,
    borderColor: '#FF9800',
    marginBottom: 16,
  },
  verifyOtpBtn: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyOtpBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendText: {
    fontSize: 14,
    color: '#FF9800',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 16,
  },
  closeModalBtn: {
    padding: 16,
    alignItems: 'center',
  },
  closeModalText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#E63946',
    fontWeight: '600',
  },
  importContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  importAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  importAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  importInfo: {
    flex: 1,
  },
  importName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  importPhone: {
    fontSize: 14,
    color: '#666',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 68,
  },
});

function createStyles(theme: { colors: { avatar: { primary: string; secondary: string; tertiary: string; }; status: { verified: string; unverified: string; favorite: string; }; success: string; warning: string; error: string; info: string; primary: string; secondary: string; background: string; surface: string; elevated: string; card: string; text: string; textSecondary: string; textTertiary: string; textInverse: string; border: string; separator: string; }; typography: { display: { large: { fontSize: number; fontWeight: "700"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; medium: { fontSize: number; fontWeight: "700"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; small: { fontSize: number; fontWeight: "700"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; }; headline: { large: { fontSize: number; fontWeight: "700"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; medium: { fontSize: number; fontWeight: "600"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; small: { fontSize: number; fontWeight: "600"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; }; title: { large: { fontSize: number; fontWeight: "600"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; medium: { fontSize: number; fontWeight: "600"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; small: { fontSize: number; fontWeight: "600"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; }; body: { large: { fontSize: number; fontWeight: "400"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; medium: { fontSize: number; fontWeight: "400"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; small: { fontSize: number; fontWeight: "400"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; }; label: { large: { fontSize: number; fontWeight: "500"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; medium: { fontSize: number; fontWeight: "500"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; small: { fontSize: number; fontWeight: "500"; lineHeight: number; color: string; fontFamily?: string | undefined | undefined; fontStyle?: "normal" | "italic" | undefined | undefined; letterSpacing?: number | undefined | undefined; textAlign?: "auto" | "left" | "right" | "center" | "justify" | undefined | undefined; textDecorationLine?: "none" | "underline" | "line-through" | "underline line-through" | undefined | undefined; textDecorationStyle?: "solid" | "double" | "dotted" | "dashed" | undefined | undefined; textDecorationColor?: ColorValue | undefined; textShadowColor?: ColorValue | undefined; textShadowOffset?: { width: number; height: number; } | undefined | undefined; textShadowRadius?: number | undefined | undefined; textTransform?: "none" | "capitalize" | "uppercase" | "lowercase" | undefined | undefined; userSelect?: "auto" | "none" | "text" | "contain" | "all" | undefined | undefined; fontVariant?: FontVariant[] | undefined | undefined; writingDirection?: "auto" | "ltr" | "rtl" | undefined | undefined; backfaceVisibility?: "visible" | "hidden" | undefined | undefined; backgroundColor?: ColorValue | undefined; borderBlockColor?: ColorValue | undefined; borderBlockEndColor?: ColorValue | undefined; borderBlockStartColor?: ColorValue | undefined; borderBottomColor?: ColorValue | undefined; borderBottomEndRadius?: string | AnimatableNumericValue | undefined; borderBottomLeftRadius?: string | AnimatableNumericValue | undefined; borderBottomRightRadius?: string | AnimatableNumericValue | undefined; borderBottomStartRadius?: string | AnimatableNumericValue | undefined; borderColor?: ColorValue | undefined; borderCurve?: "circular" | "continuous" | undefined | undefined; borderEndColor?: ColorValue | undefined; borderEndEndRadius?: string | AnimatableNumericValue | undefined; borderEndStartRadius?: string | AnimatableNumericValue | undefined; borderLeftColor?: ColorValue | undefined; borderRadius?: string | AnimatableNumericValue | undefined; borderRightColor?: ColorValue | undefined; borderStartColor?: ColorValue | undefined; borderStartEndRadius?: string | AnimatableNumericValue | undefined; borderStartStartRadius?: string | AnimatableNumericValue | undefined; borderStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; borderTopColor?: ColorValue | undefined; borderTopEndRadius?: string | AnimatableNumericValue | undefined; borderTopLeftRadius?: string | AnimatableNumericValue | undefined; borderTopRightRadius?: string | AnimatableNumericValue | undefined; borderTopStartRadius?: string | AnimatableNumericValue | undefined; outlineColor?: ColorValue | undefined; outlineOffset?: AnimatableNumericValue | undefined; outlineStyle?: "solid" | "dotted" | "dashed" | undefined | undefined; outlineWidth?: AnimatableNumericValue | undefined; opacity?: AnimatableNumericValue | undefined; elevation?: number | undefined | undefined; pointerEvents?: "box-none" | "none" | "box-only" | "auto" | undefined | undefined; isolation?: "auto" | "isolate" | undefined | undefined; cursor?: CursorValue | undefined; boxShadow?: string | readonly BoxShadowValue[] | undefined; filter?: string | readonly FilterFunction[] | undefined; mixBlendMode?: BlendMode | undefined; experimental_backgroundImage?: string | readonly GradientValue[] | undefined; alignContent?: "flex-start" | "flex-end" | "center" | "stretch" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; alignItems?: FlexAlignType | undefined; alignSelf?: "auto" | FlexAlignType | undefined; aspectRatio?: number | string | undefined | undefined; borderBottomWidth?: number | undefined | undefined; borderEndWidth?: number | undefined | undefined; borderLeftWidth?: number | undefined | undefined; borderRightWidth?: number | undefined | undefined; borderStartWidth?: number | undefined | undefined; borderTopWidth?: number | undefined | undefined; borderWidth?: number | undefined | undefined; bottom?: DimensionValue | undefined; boxSizing?: "border-box" | "content-box" | undefined | undefined; display?: "none" | "flex" | "contents" | undefined | undefined; end?: DimensionValue | undefined; flex?: number | undefined | undefined; flexBasis?: DimensionValue | undefined; flexDirection?: "row" | "column" | "row-reverse" | "column-reverse" | undefined | undefined; rowGap?: number | string | undefined | undefined; gap?: number | string | undefined | undefined; columnGap?: number | string | undefined | undefined; flexGrow?: number | undefined | undefined; flexShrink?: number | undefined | undefined; flexWrap?: "wrap" | "nowrap" | "wrap-reverse" | undefined | undefined; height?: DimensionValue | undefined; justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly" | undefined | undefined; left?: DimensionValue | undefined; margin?: DimensionValue | undefined; marginBottom?: DimensionValue | undefined; marginEnd?: DimensionValue | undefined; marginHorizontal?: DimensionValue | undefined; marginLeft?: DimensionValue | undefined; marginRight?: DimensionValue | undefined; marginStart?: DimensionValue | undefined; marginTop?: DimensionValue | undefined; marginVertical?: DimensionValue | undefined; maxHeight?: DimensionValue | undefined; maxWidth?: DimensionValue | undefined; minHeight?: DimensionValue | undefined; minWidth?: DimensionValue | undefined; overflow?: "visible" | "hidden" | "scroll" | undefined | undefined; padding?: DimensionValue | undefined; paddingBottom?: DimensionValue | undefined; paddingEnd?: DimensionValue | undefined; paddingHorizontal?: DimensionValue | undefined; paddingLeft?: DimensionValue | undefined; paddingRight?: DimensionValue | undefined; paddingStart?: DimensionValue | undefined; paddingTop?: DimensionValue | undefined; paddingVertical?: DimensionValue | undefined; position?: "absolute" | "relative" | "static" | undefined | undefined; right?: DimensionValue | undefined; start?: DimensionValue | undefined; top?: DimensionValue | undefined; width?: DimensionValue | undefined; zIndex?: number | undefined | undefined; direction?: "inherit" | "ltr" | "rtl" | undefined | undefined; inset?: DimensionValue | undefined; insetBlock?: DimensionValue | undefined; insetBlockEnd?: DimensionValue | undefined; insetBlockStart?: DimensionValue | undefined; insetInline?: DimensionValue | undefined; insetInlineEnd?: DimensionValue | undefined; insetInlineStart?: DimensionValue | undefined; marginBlock?: DimensionValue | undefined; marginBlockEnd?: DimensionValue | undefined; marginBlockStart?: DimensionValue | undefined; marginInline?: DimensionValue | undefined; marginInlineEnd?: DimensionValue | undefined; marginInlineStart?: DimensionValue | undefined; paddingBlock?: DimensionValue | undefined; paddingBlockEnd?: DimensionValue | undefined; paddingBlockStart?: DimensionValue | undefined; paddingInline?: DimensionValue | undefined; paddingInlineEnd?: DimensionValue | undefined; paddingInlineStart?: DimensionValue | undefined; shadowColor?: ColorValue | undefined; shadowOffset?: Readonly<{ width: number; height: number; }> | undefined; shadowOpacity?: AnimatableNumericValue | undefined; shadowRadius?: number | undefined | undefined; transform?: string | readonly (({ scaleX: AnimatableNumericValue; } & { scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scaleY: AnimatableNumericValue; } & { scaleX?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateX: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ translateY: AnimatableNumericValue | `${number}%`; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ perspective: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotate: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ rotateZ: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ scale: AnimatableNumericValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; skewX?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewX: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewY?: undefined; matrix?: undefined; }) | ({ skewY: AnimatableStringValue; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; matrix?: undefined; }) | ({ matrix: AnimatableNumericValue[]; } & { scaleX?: undefined; scaleY?: undefined; translateX?: undefined; translateY?: undefined; perspective?: undefined; rotate?: undefined; rotateX?: undefined; rotateY?: undefined; rotateZ?: undefined; scale?: undefined; skewX?: undefined; skewY?: undefined; }))[] | undefined; transformOrigin?: string | (string | number)[] | undefined; transformMatrix?: number[] | undefined; rotation?: AnimatableNumericValue | undefined; scaleX?: AnimatableNumericValue | undefined; scaleY?: AnimatableNumericValue | undefined; translateX?: AnimatableNumericValue | undefined; translateY?: AnimatableNumericValue | undefined; textAlignVertical?: "auto" | "top" | "bottom" | "center" | undefined | undefined; verticalAlign?: "auto" | "top" | "bottom" | "middle" | undefined | undefined; includeFontPadding?: boolean | undefined | undefined; }; }; }; shadows: { small: { shadowColor: string; shadowOffset: { width: number; height: number; }; shadowOpacity: number; shadowRadius: number; elevation: number; }; medium: { shadowColor: string; shadowOffset: { width: number; height: number; }; shadowOpacity: number; shadowRadius: number; elevation: number; }; large: { shadowColor: string; shadowOffset: { width: number; height: number; }; shadowOpacity: number; shadowRadius: number; elevation: number; }; }; }): any {
  throw new Error('Function not implemented.');
}

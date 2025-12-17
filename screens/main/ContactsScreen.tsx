import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyContact } from '../../services/emergencyService';

const CONTACTS_KEY = 'emergency_contacts';

interface ContactsScreenProps {
  onContactsChange: (contacts: EmergencyContact[]) => void;
}

export default function ContactsScreen({ onContactsChange }: ContactsScreenProps) {
  const { t } = useTranslation();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [relationship, setRelationship] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const stored = await AsyncStorage.getItem(CONTACTS_KEY);
      if (stored) {
        const parsedContacts = JSON.parse(stored);
        setContacts(parsedContacts);
        onContactsChange(parsedContacts);
      }
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveContacts = async (newContacts: EmergencyContact[]) => {
    try {
      await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(newContacts));
      setContacts(newContacts);
      onContactsChange(newContacts);
    } catch (error) {
      console.error('Error saving contacts:', error);
      Alert.alert(t('error'), 'Failed to save contacts');
    }
  };

  const openAddContactModal = () => {
    setEditingContact(null);
    setName('');
    setPhoneNumber('');
    setRelationship('');
    setModalVisible(true);
  };

  const openEditContactModal = (contact: EmergencyContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhoneNumber(contact.phoneNumber);
    setRelationship(contact.relationship);
    setModalVisible(true);
  };

  const handleSaveContact = () => {
    if (!name || !phoneNumber || !relationship) {
      Alert.alert(t('error'), 'Please fill in all fields');
      return;
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^\+?[\d\s-()]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert(t('error'), 'Please enter a valid phone number');
      return;
    }

    if (editingContact) {
      // Update existing contact
      const updatedContacts = contacts.map((c) =>
        c.id === editingContact.id
          ? { ...c, name, phoneNumber, relationship }
          : c
      );
      saveContacts(updatedContacts);
    } else {
      // Add new contact
      const newContact: EmergencyContact = {
        id: Date.now().toString(),
        name,
        phoneNumber,
        relationship,
        verified: false,
      };
      saveContacts([...contacts, newContact]);
    }

    setModalVisible(false);
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert(
      t('deleteContact'),
      'Are you sure you want to delete this contact?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            const updatedContacts = contacts.filter((c) => c.id !== id);
            saveContacts(updatedContacts);
          },
        },
      ]
    );
  };

  const handleVerifyContact = (id: string) => {
    Alert.alert(
      t('verifyContact'),
      'Send a verification message to this contact?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: () => {
            const updatedContacts = contacts.map((c) =>
              c.id === id ? { ...c, verified: true } : c
            );
            saveContacts(updatedContacts);
            Alert.alert(t('success'), 'Contact verified successfully');
          },
        },
      ]
    );
  };

  const handleImportFromPhone = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(t('error'), t('contactsPermissionDenied'));
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      if (data.length > 0) {
        // Show contact picker (simplified - in production, use a proper picker)
        Alert.alert(
          'Import Contact',
          `Found ${data.length} contacts. Feature coming soon.`
        );
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      Alert.alert(t('error'), 'Failed to import contacts');
    }
  };

  const renderContactItem = ({ item }: { item: EmergencyContact }) => (
    <View style={styles.contactItem}>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
        <Text style={styles.contactPhone}>{item.phoneNumber}</Text>
        <Text style={styles.contactRelationship}>{item.relationship}</Text>
      </View>

      <View style={styles.contactActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditContactModal(item)}
          accessibilityLabel="Edit contact"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        {!item.verified && (
          <TouchableOpacity
            style={[styles.actionButton, styles.verifyButton]}
            onPress={() => handleVerifyContact(item.id)}
            accessibilityLabel="Verify contact"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>Verify</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteContact(item.id)}
          accessibilityLabel="Delete contact"
          accessibilityRole="button"
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('emergencyContacts')}</Text>
        <Text style={styles.subtitle}>
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} added
        </Text>
      </View>

      <FlatList
        data={contacts}
        renderItem={renderContactItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('noContacts')}</Text>
            <Text style={styles.emptySubtext}>
              Add emergency contacts who will be notified in case of emergency
            </Text>
          </View>
        }
      />

      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.importButton}
          onPress={handleImportFromPhone}
          accessibilityLabel="Import from phone contacts"
          accessibilityRole="button"
        >
          <Text style={styles.importButtonText}>📱 Import from Phone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={openAddContactModal}
          accessibilityLabel="Add new contact"
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>+ {t('addContact')}</Text>
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
            <Text style={styles.modalTitle}>
              {editingContact ? t('editContact') : t('addContact')}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={t('contactName')}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              accessibilityLabel="Contact name input"
            />

            <TextInput
              style={styles.input}
              placeholder={t('contactPhone')}
              placeholderTextColor="#999"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              accessibilityLabel="Contact phone number input"
            />

            <TextInput
              style={styles.input}
              placeholder={t('contactRelationship')}
              placeholderTextColor="#999"
              value={relationship}
              onChangeText={setRelationship}
              accessibilityLabel="Contact relationship input"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveContact}
                accessibilityLabel="Save contact"
                accessibilityRole="button"
              >
                <Text style={styles.saveButtonText}>{t('save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#E63946',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  listContainer: {
    padding: 20,
    flexGrow: 1,
  },
  contactItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  contactInfo: {
    marginBottom: 15,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  verifiedBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  contactPhone: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  contactRelationship: {
    fontSize: 14,
    color: '#999',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#E63946',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    backgroundColor: '#757575',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomButtons: {
    padding: 20,
    gap: 10,
  },
  importButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#E63946',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 25,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#E63946',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

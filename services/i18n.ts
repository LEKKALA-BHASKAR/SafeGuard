import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'app_language';

// Translation resources
const resources = {
  en: {
    translation: {
      // Auth
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      displayName: 'Full Name',
      forgotPassword: 'Forgot Password?',
      
      // Home
      home: 'Home',
      emergency: 'Emergency',
      contacts: 'Contacts',
      profile: 'Profile',
      settings: 'Settings',
      
      // SOS
      sosButton: 'SOS - PRESS FOR HELP',
      sosLongPress: 'Hold for 3 seconds',
      sosActivated: 'EMERGENCY ALERT ACTIVATED',
      sosConfirm: 'Are you sure you want to send emergency alert?',
      sosSending: 'Sending emergency alerts...',
      sosSent: 'Emergency alerts sent successfully',
      sosCallPolice: 'Call Emergency Services',
      
      // Location
      locationSharing: 'Location Sharing',
      shareLocation: 'Share Location',
      stopSharing: 'Stop Sharing',
      currentLocation: 'Current Location',
      trackingEnabled: 'Tracking Enabled',
      trackingDisabled: 'Tracking Disabled',
      
      // Contacts
      emergencyContacts: 'Emergency Contacts',
      addContact: 'Add Contact',
      editContact: 'Edit Contact',
      deleteContact: 'Delete Contact',
      verifyContact: 'Verify Contact',
      contactName: 'Name',
      contactPhone: 'Phone Number',
      contactRelationship: 'Relationship',
      noContacts: 'No emergency contacts added',
      
      // Profile
      myProfile: 'My Profile',
      phoneNumber: 'Phone Number',
      saveProfile: 'Save Profile',
      profileUpdated: 'Profile updated successfully',
      
      // Privacy
      privacySettings: 'Privacy Settings',
      shareWithContacts: 'Share with Contacts',
      trackingDuration: 'Tracking Duration',
      backgroundTracking: 'Background Tracking',
      unlimited: 'Unlimited',
      minutes: 'minutes',
      
      // Common
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add',
      yes: 'Yes',
      no: 'No',
      ok: 'OK',
      error: 'Error',
      success: 'Success',
      loading: 'Loading...',
      
      // Errors
      locationPermissionDenied: 'Location permission denied',
      contactsPermissionDenied: 'Contacts permission denied',
      smsPermissionDenied: 'SMS permission denied',
      networkError: 'Network error. Please check your connection.',
      genericError: 'An error occurred. Please try again.',
    },
  },
  es: {
    translation: {
      // Auth
      login: 'Iniciar sesión',
      register: 'Registrarse',
      email: 'Correo electrónico',
      password: 'Contraseña',
      confirmPassword: 'Confirmar contraseña',
      displayName: 'Nombre completo',
      forgotPassword: '¿Olvidaste tu contraseña?',
      
      // Home
      home: 'Inicio',
      emergency: 'Emergencia',
      contacts: 'Contactos',
      profile: 'Perfil',
      settings: 'Configuración',
      
      // SOS
      sosButton: 'SOS - PRESIONA PARA AYUDA',
      sosLongPress: 'Mantener presionado 3 segundos',
      sosActivated: 'ALERTA DE EMERGENCIA ACTIVADA',
      sosConfirm: '¿Estás seguro de enviar alerta de emergencia?',
      sosSending: 'Enviando alertas de emergencia...',
      sosSent: 'Alertas de emergencia enviadas exitosamente',
      sosCallPolice: 'Llamar servicios de emergencia',
      
      // Location
      locationSharing: 'Compartir ubicación',
      shareLocation: 'Compartir ubicación',
      stopSharing: 'Detener compartir',
      currentLocation: 'Ubicación actual',
      trackingEnabled: 'Rastreo activado',
      trackingDisabled: 'Rastreo desactivado',
      
      // Contacts
      emergencyContacts: 'Contactos de emergencia',
      addContact: 'Agregar contacto',
      editContact: 'Editar contacto',
      deleteContact: 'Eliminar contacto',
      verifyContact: 'Verificar contacto',
      contactName: 'Nombre',
      contactPhone: 'Número de teléfono',
      contactRelationship: 'Relación',
      noContacts: 'No hay contactos de emergencia',
      
      // Profile
      myProfile: 'Mi perfil',
      phoneNumber: 'Número de teléfono',
      saveProfile: 'Guardar perfil',
      profileUpdated: 'Perfil actualizado exitosamente',
      
      // Privacy
      privacySettings: 'Configuración de privacidad',
      shareWithContacts: 'Compartir con contactos',
      trackingDuration: 'Duración del rastreo',
      backgroundTracking: 'Rastreo en segundo plano',
      unlimited: 'Ilimitado',
      minutes: 'minutos',
      
      // Common
      save: 'Guardar',
      cancel: 'Cancelar',
      confirm: 'Confirmar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Agregar',
      yes: 'Sí',
      no: 'No',
      ok: 'OK',
      error: 'Error',
      success: 'Éxito',
      loading: 'Cargando...',
      
      // Errors
      locationPermissionDenied: 'Permiso de ubicación denegado',
      contactsPermissionDenied: 'Permiso de contactos denegado',
      smsPermissionDenied: 'Permiso de SMS denegado',
      networkError: 'Error de red. Por favor verifica tu conexión.',
      genericError: 'Ocurrió un error. Por favor intenta de nuevo.',
    },
  },
  hi: {
    translation: {
      // Auth
      login: 'लॉग इन करें',
      register: 'पंजीकरण करें',
      email: 'ईमेल',
      password: 'पासवर्ड',
      confirmPassword: 'पासवर्ड की पुष्टि करें',
      displayName: 'पूरा नाम',
      forgotPassword: 'पासवर्ड भूल गए?',
      
      // Home
      home: 'होम',
      emergency: 'आपातकाल',
      contacts: 'संपर्क',
      profile: 'प्रोफ़ाइल',
      settings: 'सेटिंग्स',
      
      // SOS
      sosButton: 'SOS - मदद के लिए दबाएं',
      sosLongPress: '3 सेकंड के लिए दबाए रखें',
      sosActivated: 'आपातकालीन अलर्ट सक्रिय',
      sosConfirm: 'क्या आप आपातकालीन अलर्ट भेजना चाहते हैं?',
      sosSending: 'आपातकालीन अलर्ट भेजा जा रहा है...',
      sosSent: 'आपातकालीन अलर्ट सफलतापूर्वक भेजा गया',
      sosCallPolice: 'आपातकालीन सेवाओं को कॉल करें',
      
      // Location
      locationSharing: 'स्थान साझा करना',
      shareLocation: 'स्थान साझा करें',
      stopSharing: 'साझा करना बंद करें',
      currentLocation: 'वर्तमान स्थान',
      trackingEnabled: 'ट्रैकिंग सक्षम',
      trackingDisabled: 'ट्रैकिंग अक्षम',
      
      // Contacts
      emergencyContacts: 'आपातकालीन संपर्क',
      addContact: 'संपर्क जोड़ें',
      editContact: 'संपर्क संपादित करें',
      deleteContact: 'संपर्क हटाएं',
      verifyContact: 'संपर्क सत्यापित करें',
      contactName: 'नाम',
      contactPhone: 'फ़ोन नंबर',
      contactRelationship: 'रिश्ता',
      noContacts: 'कोई आपातकालीन संपर्क नहीं जोड़ा गया',
      
      // Profile
      myProfile: 'मेरी प्रोफ़ाइल',
      phoneNumber: 'फ़ोन नंबर',
      saveProfile: 'प्रोफ़ाइल सहेजें',
      profileUpdated: 'प्रोफ़ाइल सफलतापूर्वक अपडेट किया गया',
      
      // Privacy
      privacySettings: 'गोपनीयता सेटिंग्स',
      shareWithContacts: 'संपर्कों के साथ साझा करें',
      trackingDuration: 'ट्रैकिंग अवधि',
      backgroundTracking: 'बैकग्राउंड ट्रैकिंग',
      unlimited: 'असीमित',
      minutes: 'मिनट',
      
      // Common
      save: 'सहेजें',
      cancel: 'रद्द करें',
      confirm: 'पुष्टि करें',
      delete: 'हटाएं',
      edit: 'संपादित करें',
      add: 'जोड़ें',
      yes: 'हाँ',
      no: 'नहीं',
      ok: 'ठीक है',
      error: 'त्रुटि',
      success: 'सफलता',
      loading: 'लोड हो रहा है...',
      
      // Errors
      locationPermissionDenied: 'स्थान अनुमति अस्वीकृत',
      contactsPermissionDenied: 'संपर्क अनुमति अस्वीकृत',
      smsPermissionDenied: 'SMS अनुमति अस्वीकृत',
      networkError: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
      genericError: 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    },
  },
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Load saved language
export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
};

// Save language preference
export const saveLanguage = async (language: string) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

export default i18n;

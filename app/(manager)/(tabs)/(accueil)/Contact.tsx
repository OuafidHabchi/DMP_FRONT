import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useUser } from "@/context/UserContext"; // ✅ Utilisation du UserContext
import PickerModal from '@/components/src/PickerModal';
import AppURL from '@/components/src/URL';
import axios from 'axios';

type MessageType = {
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
  fixer: boolean;
};



const Contact = () => {
  // ✅ Récupérer l'utilisateur depuis le contexte
  const { user, loadingContext } = useUser();
  // 📌 États du formulaire
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState(''); // success | error
  const [showModal, setShowModal] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);


  const fetchMessages = async () => {
    setLoadingMessages(true);
    try {
      const response = await axios.get(`${AppURL}/api/contact/all?dsp_code=${user?.dsp_code}`);
      if (response.status === 200) {
        setMessages(response.data.reverse() as MessageType[]);
      } else {
        showAlert(isEnglish ? 'Error loading messages.' : 'Erreur lors du chargement des messages.', 'error');
      }
    } catch (error) {
      console.error('Erreur de récupération des messages:', error);
      showAlert(isEnglish ? 'Error loading messages.' : 'Erreur lors du chargement des messages.', 'error');
    } finally {
      setLoadingMessages(false);
    }
  };



  const showAlert = (message: React.SetStateAction<string>, type: React.SetStateAction<string>) => {
    setAlertMessage(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMessage('');
      setAlertType('');
    }, 7000);
  };



  // 📌 Textes en fonction de la langue utilisateur
  const isEnglish = user?.language === 'English';
  const labels = {
    title: isEnglish ? 'Contact Us' : 'Contactez-nous',
    name: isEnglish ? 'Name:' : 'Nom :',
    email: isEnglish ? 'Email:' : 'Email :',
    subject: isEnglish ? 'Select Subject' : 'Sélectionnez un objet',
    messagePlaceholder: isEnglish ? 'Your message...' : 'Votre message...',
    submit: isEnglish ? 'Send' : 'Envoyer',
    success: isEnglish
      ? 'Your message has been sent successfully. We will get back to you as soon as possible.'
      : 'Votre message a été envoyé avec succès. On vous répond dans le plus bref délai.',
    error: isEnglish ? 'An error occurred. Please try again.' : 'Une erreur est survenue. Veuillez réessayer.',
    emptyFields: isEnglish ? 'Please fill in all fields.' : 'Veuillez remplir tous les champs.',
  };

  const thankYouMessage = isEnglish
    ? 'Thank you for using DMP (DSP Management Partenaire). Use this page to communicate anything related to the management of your DSP.'
    : 'Merci d\'utiliser DMP (DSP Management Partenaire). Utilisez cette page pour nous communiquer tout ce qui concerne le management de votre DSP.';



  // 📌 Validation et Envoi du formulaire
  const handleSubmit = async () => {
    if (!subject || !message) {
      Alert.alert('Erreur', labels.emptyFields);
      window.alert(labels.emptyFields);

      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${AppURL}/api/contact/create`,
        {
          userId: user?._id,
          subject,
          message,
          email: user?.email, // Ajout de l'email
          tel: user?.tel,
          dsp_code: user?.dsp_code,
        }
      );

      if (response.status === 200) {
        showAlert(labels.success, 'success');
        setMessage('');
        setSubject('');
      } else {
        showAlert(labels.error, 'error');
      }
    } catch (error) {
      console.error('Erreur réseau:', error);
      showAlert(labels.error, 'error');
    } finally {
      setIsLoading(false);
    }


  };

  // 📌 Affichage du chargement du contexte utilisateur
  if (loadingContext) {
    return <ActivityIndicator size="large" color="#001933" />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {alertMessage ? (
        <View style={[styles.alert, alertType === 'success' ? styles.alertSuccess : styles.alertError]}>
          <Text style={styles.alertText}>{alertMessage}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>{labels.title}</Text>

        {/* Affichage des informations utilisateur */}
        <View style={styles.userInfo}>
          <Text style={styles.label}>{labels.name}</Text>
          <Text style={styles.value}> {user?.name} {user?.familyName}</Text>
          <Text style={styles.label}>{labels.email}</Text>
          <Text style={styles.value}>{user?.email}</Text>
          <TouchableOpacity
            style={styles.viewMessagesButton}
            onPress={() => {
              setShowModal(true);
              fetchMessages();
            }}
          >
            <Text style={styles.viewMessagesButtonText}>
              {isEnglish ? 'View Previous Messages' : 'Voir les messages précédents'}
            </Text>
          </TouchableOpacity>
        </View>



        {/* Sélection de l'objet du message avec PickerModal */}
        <PickerModal
          title={labels.subject}
          options={[
            { label: isEnglish ? 'Complaint' : 'Réclamation', value: 'Réclamation' },
            { label: isEnglish ? 'Modification Request' : 'Demande de modification', value: 'Demande de modification' },
            { label: isEnglish ? 'Suggestion' : 'Suggestion', value: 'Suggestion' },
            { label: isEnglish ? 'Technical Issue' : 'Problème technique', value: 'Problème technique' },
            { label: isEnglish ? 'Account Issue' : 'Problème de compte', value: 'Problème de compte' },
            { label: isEnglish ? 'Payment Issue' : 'Problème de paiement', value: 'Problème de paiement' },
            { label: isEnglish ? 'Feedback' : 'Retour d\'expérience', value: 'Retour d\'expérience' },
            { label: isEnglish ? 'Partnership Inquiry' : 'Demande de partenariat', value: 'Demande de partenariat' },
            { label: isEnglish ? 'Other' : 'Autre', value: 'Autre' },
          ]}

          selectedValue={subject}
          onValueChange={(value) => setSubject(value)}
        />

        {/* Champ du message */}
        <TextInput
          style={styles.textInput}
          placeholder={labels.messagePlaceholder}
          placeholderTextColor="#888"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
        />
        <Text style={styles.charCounter}>{message.length}/1000</Text>

        {/* Bouton d'envoi stylé */}
        <TouchableOpacity
          style={[styles.submitButton, (isLoading || !subject || !message) && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading || !subject || !message}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{labels.submit}</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.thankYouText}>{thankYouMessage}</Text>
      </ScrollView>

      {showModal && (
        <View style={styles.modalMsg_container}>
          <View style={styles.modalMsg_content}>
            <Text style={styles.modalMsg_title}>
              {isEnglish ? 'Previous Messages' : 'Messages Précédents'}
            </Text>

            {loadingMessages ? (
              <ActivityIndicator size="large" color="#001933" />
            ) : (
              <ScrollView>
                {messages.map((msg, index) => (
                  <View key={index} style={styles.modalMsg_messageItem}>
                    <Text style={styles.modalMsg_messageSubject}>
                      {isEnglish ? 'Subject: ' : 'Objet :'} {msg.subject}
                    </Text>
                    <Text style={styles.modalMsg_messageDate}>
                      {new Date(msg.createdAt).toLocaleDateString(isEnglish ? 'en-US' : 'fr-FR')}
                    </Text>
                    <Text style={[
                      styles.modalMsg_messageStatus,
                      msg.read ? styles.modalMsg_read : styles.modalMsg_unread
                    ]}>
                      {msg.read ? (isEnglish ? 'Read' : 'Lu') : (isEnglish ? 'Unread' : 'Non Lu')}
                    </Text>
                    <Text style={[
                      styles.modalMsg_messageStatus,
                      msg.fixer ? styles.modalMsg_fixed : styles.modalMsg_notFixed
                    ]}>
                      {msg.fixer
                        ? (isEnglish ? 'Fixed' : 'Fixé')
                        : (msg.read
                          ? (isEnglish ? 'We are working on your request' : 'Nous travaillons sur votre demande')
                          : (isEnglish ? 'Not Fixed' : 'Non Fixé')
                        )
                      }
                    </Text>

                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.modalMsg_closeButton}
              onPress={() => setShowModal(false)}
            >
              <Text style={styles.modalMsg_closeButtonText}>
                {isEnglish ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}




    </KeyboardAvoidingView>
  );
};

export default Contact;

const styles = StyleSheet.create({

  viewMessagesButton: {
    backgroundColor: '#001933',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  viewMessagesButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalMsg_container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalMsg_content: {
    backgroundColor: '#ffffff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#001933',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  modalMsg_title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalMsg_messageItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#001933',
  },
  modalMsg_messageSubject: {
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 5,
  },
  modalMsg_messageText: {
    color: '#001933',
    marginVertical: 5,
    lineHeight: 20,
  },
  modalMsg_messageDate: {
    color: '#001933',
    fontStyle: 'italic',
    marginBottom: 5,
    fontSize: 12,
  },
  modalMsg_messageStatus: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  modalMsg_read: {
    color: '#4CAF50',
  },
  modalMsg_unread: {
    color: '#F44336',
  },
  modalMsg_fixed: {
    color: '#2196F3',
  },
  modalMsg_notFixed: {
    color: '#9E9E9E',
  },
  modalMsg_closeButton: {
    backgroundColor: '#001f3f',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  modalMsg_closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },


  thankYouText: {
    textAlign: 'center',
    color: '#001933',
    marginTop: 10,
    fontStyle: 'italic',
    opacity: 0.8,
  },

  alert: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 15,
    zIndex: 100,
    borderRadius: 5,
    margin: 10,
  },
  alertSuccess: {
    backgroundColor: '#001933',
  },
  alertError: {
    backgroundColor: '#F44336',
  },
  alertText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 20,
  },
  userInfo: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#001933',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  label: {
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 5,
  },
  value: {
    color: '#001933',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 50,
    borderRadius: 10,
    textAlignVertical: 'top',
    marginBottom: 10,
    borderColor: '#001933',
    borderWidth: 1,
    color: '#001933',
  },
  charCounter: {
    textAlign: 'right',
    color: '#001933',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#001933',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
});

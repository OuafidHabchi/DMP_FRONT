import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Platform, ScrollView, Pressable, Image, Modal, Alert } from 'react-native';
import axios from 'axios';
import io from 'socket.io-client';
import { Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import des icônes
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AutoLink from 'react-native-autolink';
import ImageViewer from 'react-native-image-zoom-viewer'; // Import the library
import { Video, ResizeMode } from 'expo-av'; // Si vous utilisez des vidéos avec Expo
import * as DocumentPicker from 'expo-document-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AppURL from '@/components/src/URL';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';
import { getSocket, disconnectSocket } from '@/components/src/socket';



const windowHeight = Dimensions.get('window').height;
// Initialize the socket
interface Message {
  _id: string;
  content: string;
  fileUrl?: string;  // Ajoutez la propriété fileUrl pour les images
  senderId: string;
  conversationId: string;
  timestamp: string;
}

// User type definition
type User = {
  _id: string;
  name: string;
  familyName: string;
  tel: string;
  email: string;
  password: string;
  role: string;
  language: string,
  dsp_code: string,
  conversation: string;
  expoPushToken?: string;
};


export default function Chat() {
  const { conversationId, participantIds } = useLocalSearchParams();
  const { user: parsedUser, socket } = useUser(); // 🔹 Récupérer `user` depuis UserContext
  const parsedParticipantIds: string[] = JSON.parse(participantIds as string);
  // 🔹 Vérifier si `parsedUser` est bien chargé avant d'exécuter le reste du composant
  if (!parsedUser) {
    return <View><Text>Loading...</Text></View>; // 🔄 Afficher un écran de chargement temporaire
  }


  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);
  const [inputHeight, setInputHeight] = useState(40); // Initial height of the input
  const [fileUri, setFileUri] = useState<string | null>(null);  // État pour gérer le fichier sélectionné
  const flatListRef = useRef<FlatList>(null);  // Ref for FlatList on mobile
  const scrollViewRef = useRef<ScrollView>(null); // Ref for ScrollView on web
  const [newMessageReceived, setNewMessageReceived] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null)
  const [isVideo, setIsVideo] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!socket || !parsedUser || !conversationId) return;

    // Charger les données au montage
    const initializeData = async () => {
      await fetchConversationParticipants();
      await fetchMessages();
    };
    initializeData();

    // Écouter les nouveaux messages
    socket.on('newMessage', (newMessage: Message) => {
      if (newMessage.conversationId === conversationId) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setNewMessageReceived(true);
      }
    });

    // Nettoyage à la fin du cycle de vie
    return () => {
      socket.off('newMessage');
    };
  }, [socket, parsedUser, conversationId]);





  useEffect(() => {
    if (participants.length > 0) {
    }
  }, [participants]);


  // Scroll to the bottom only when a new message arrives
  useEffect(() => {
    if (newMessageReceived) {
      if (Platform.OS === 'web') {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      } else {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
      setNewMessageReceived(false); // Reset new message flag after scrolling
    }
  }, [newMessageReceived]);


  // Function to handle media click (image or video)
  const onMediaClick = (uri: string, isVideo: boolean) => {
    setSelectedImageUri(uri);
    setIsVideo(isVideo);
    setModalVisible(true);
  };


  // Fetch messages from the conversation
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/messages/messages/${conversationId}?dsp_code=${parsedUser.dsp_code}`);
      setMessages(response.data);
      if (Platform.OS === 'web') {
        scrollViewRef.current?.scrollToEnd({ animated: true }); // Scroll to the bottom on web
      } else {
        flatListRef.current?.scrollToEnd({ animated: true }); // Scroll to the bottom on mobile
      }
    } catch (error) {
    }
  };

  // Fetch conversation participants
  const fetchConversationParticipants = async () => {
    try {
      // Exclude the current user's ID to only retrieve other participants
      const otherParticipantIds = parsedParticipantIds.filter(id => id !== parsedUser._id);

      if (otherParticipantIds.length === 0) return; // Check if there are participants to fetch

      // Make a single request with all participant IDs
      const response = await axios.post(`${AppURL}/api/employee/by-ids?dsp_code=${parsedUser.dsp_code}`, { // URL is fine with backticks
        ids: otherParticipantIds // Send the IDs as data in the POST request
      });
      // Update the state with the fetched participant data
      setParticipants(response.data as User[]);

    } catch (error) {
    }
  };

  // Fonction pour choisir une vidéo
  const pickVideo = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission d'accès à la galerie requise !");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const videoUri = result.assets[0].uri;

      if (Platform.OS === 'web') {
        // Fetch the blob from the blob URI
        const response = await fetch(videoUri);
        const videoBlob = await response.blob();

        // Create a file object from the blob
        const videoFile = new File([videoBlob], `video-${Date.now()}.mp4`, { type: videoBlob.type });

        // Generate a URL for previewing or uploading
        const videoUrl = URL.createObjectURL(videoBlob);
        setFileUri(videoUrl); // For preview in the UI

        // If needed, append videoFile to FormData for uploading
      } else {
        // Directly use the URI for mobile platforms
        setFileUri(videoUri);
      }
    }
  };



  // Fonction pour choisir un fichier
  const pickPicture = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Permission d'accès à la galerie requise !");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      try {
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500 } }], // Redimensionne à une largeur maximale de 800px
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Compression à 70%
        );

        setFileUri(manipulatedImage.uri); // Stocker l'URI compressée
      } catch (error) {
      }
    }
  };

  // Fonction pour choisir un fichier (PDF, Word, etc.)
  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Permet de sélectionner tous types de fichiers
        copyToCacheDirectory: true, // Copie le fichier dans le cache pour un accès plus facile
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0]; // Accédez au premier élément de assets
        const { uri, name, mimeType } = file; // Déstructuration des propriétés
        // Traitez le fichier comme nécessaire, par exemple, le stocker dans l'état
        setFileUri(uri);
      } else {
      }
    } catch (error) {
    }
  };


  const downloadPdf = async (fileUrl: string) => {
    if (Platform.OS === 'web') {
      // Utilise la fonction pour le web
      await downloadPdfWeb(fileUrl);
    } else {
      // Utilise la fonction pour le mobile
      const fileName = fileUrl.split('/').pop() || 'download.pdf';
      const downloadPath = `${FileSystem.documentDirectory}${fileName}`;

      try {
        const { uri } = await FileSystem.downloadAsync(fileUrl, downloadPath);
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('File does not exist after download.');
        }
        // Share the downloaded file
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
      } catch (error: any) {
        Alert.alert('Error', 'An error occurred while downloading or sharing the file.');
      }
    }
  };


  // Function for force downloading a PDF using Blob
  const downloadPdfWeb = async (fileUrl: string) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileUrl.split('/').pop() ?? 'download.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke the URL object after download to free memory
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('An error occurred while downloading the file.');
    }
  };




  // Fonction pour envoyer des messages (texte et/ou fichier - image, vidéo ou document)
  const sendMessage = async () => {
    if (!message.trim() && !fileUri) return; // Quitte si aucun message ou fichier n'est fourni
    setIsSending(true); // Démarrer le chargement
    // Création des données du message
    const messageData = {
      conversationId,
      senderId: parsedUser._id,
      content: message.trim() || '',
      senderName: parsedUser.name,
      senderfamilyName: parsedUser.familyName,
      participants,
    };

    // Création de l'objet FormData pour l'envoi
    const formData = new FormData();
    formData.append('messageData', JSON.stringify(messageData));

    // Ajout du fichier s'il est présent
    if (fileUri) {
      try {
        if (Platform.OS === 'web') {
          // Gérer les URIs de type 'blob:' pour les images, vidéos et documents
          if (fileUri.startsWith('blob:') || fileUri.startsWith('data:') || fileUri.startsWith('file:')) {
            const response = await fetch(fileUri);
            const fileBlob = await response.blob();
            if (fileBlob.size > 50 * 1024 * 1024) { // Limite de 50 Mo
              alert("La vidéo est trop volumineuse (max 50 MB).");
              return;
            }
            const mimeType = fileBlob.type; // Récupérer le type MIME du Blob
            // Déterminer l'extension en fonction du type MIME
            let fileType = '';
            if (mimeType.startsWith('image/')) {
              fileType = mimeType.split('/')[1]; // Exemple : 'jpeg', 'png'
            } else if (mimeType.startsWith('video/')) {
              fileType = mimeType.split('/')[1]; // Exemple : 'mp4', 'quicktime'
            } else if (mimeType === 'application/pdf' || mimeType.startsWith('application/')) {
              fileType = mimeType.split('/')[1]; // Exemple : 'pdf', 'msword'
            } else {
              console.error('Type de fichier non pris en charge:', mimeType);
              alert(`Type de fichier non pris en charge: ${mimeType}`);
              return; // Quitte si le type MIME n'est pas pris en charge
            }

            const fileName = `upload-${Date.now()}.${fileType}`;
            formData.append('file', new File([fileBlob], fileName, { type: mimeType }));
          } else {
            setIsSending(false); // Arrêter le chargement en cas d'erreur
            alert(`URI non pris en charge: ${fileUri}`);

            return; // Quitte si l'URI n'est pas pris en charge
          }
        }

        if (Platform.OS !== "web") {
          // Gestion sur mobile (iOS/Android) avec FileSystem
          const fileType = (fileUri.split('.').pop() ?? 'unknown').toLowerCase();
          let mimeType = '';
          // Détermination du type MIME en fonction de l'extension
          if (['jpg', 'jpeg', 'png', 'gif'].includes(fileType)) {
            mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;
          } else if (['mp4', 'mov'].includes(fileType)) {
            mimeType = fileType === 'mov' ? 'video/quicktime' : `video/${fileType}`;
          } else if (['pdf', 'doc', 'docx'].includes(fileType)) {
            mimeType = `application/${fileType}`;
          } else {
            console.error('Type de fichier non pris en charge:', fileType);
            alert(`Type de fichier non pris en charge: ${fileType}`);
            return; // Quitte si le type de fichier n'est pas pris en charge
          }

          const fileInfo = await FileSystem.getInfoAsync(fileUri);
          formData.append('file', {
            uri: fileInfo.uri,
            name: `upload.${fileType}`,
            type: mimeType,
          } as any);

        }
      } catch (error) {
        setIsSending(false); // Arrêter le chargement en cas d'erreur
        // console.error('Erreur lors de la préparation du fichier pour l\'envoi:', error);
        return; // Quitte s'il y a une erreur de préparation du fichier
      }
    }
    try {
      // Log les données du FormData avant l'envoi
      formData.forEach((value, key) => {
      });

      const response = await fetch(`${AppURL}/api/messages/messages/upload?dsp_code=${parsedUser.dsp_code}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        setIsSending(false); // Arrêter le chargement en cas d'erreur

      }

      if (response.status === 200) {
        setIsSending(false); // Arrêter le chargement en cas d'erreur
        const savedMessage = await response.json();
        socket?.emit('newMessage', savedMessage); // Émission du nouveau message via Socket.IO
        setMessage(''); // Réinitialisation du champ de message
        setFileUri(null); // Réinitialisation de l'URI du fichier
        setMessage(''); // Réinitialise la zone de texte après l'envoi
      } else {
        setIsSending(false); // Arrêter le chargement en cas d'erreur
        // console.error('Échec de l\'envoi du message:', response.status, response.statusText);
      }
    } catch (error) {
      setIsSending(false); // Arrêter le chargement en cas d'erreur
      if (error instanceof Error) {
        // console.error('Message d\'erreur:', error.message);
      }
    }
  };


  const getInitials = (name: string, familyName: string) => {
    if (!name || !familyName) return '?';
    return `${name.charAt(0).toUpperCase()}${familyName.charAt(0).toUpperCase()}`;
  };

  // Function to clear the uploaded image
  const clearFile = () => {
    setFileUri(null); // Clear the file URI
  };



  return (
    <>
      {Platform.OS !== "web" && (
        <View style={styles.container}>
          <View style={styles.conversationContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={({ item }) => {
                const isCurrentUser = item.senderId === parsedUser._id;
                const sender = isCurrentUser ? parsedUser : participants.find(p => p._id === item.senderId);
                const initials = sender ? getInitials(parsedUser.name, parsedUser.familyName) : '?';

                return (
                  <View
                    style={[
                      styles.messageRow,
                      isCurrentUser ? styles.currentUserRow : styles.otherUserRow,
                    ]}
                  >
                    {!isCurrentUser && (
                      <View style={styles.initialsContainer}>
                        <Text style={styles.initials}>{initials}</Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageContainer,
                        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
                      ]}
                    >
                      {item.content && (
                        <AutoLink
                          text={item.content} // Utilisez la propriété 'text' pour afficher le contenu
                          linkDefault={true}
                          linkStyle={{ color: '#FFA500', textDecorationLine: 'underline' }}
                          style={[
                            styles.messageText,
                            isCurrentUser ? styles.currentUserText : styles.otherUserText,
                          ]}
                        />
                      )}


                      {item.fileUrl && (
                        item.fileUrl.endsWith('.mp4') || item.fileUrl.endsWith('.mov') ? (

                          <Video
                            source={{ uri: `${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}` }}
                            style={{ width: 150, height: 100, borderRadius: 10 }}
                            useNativeControls
                            resizeMode={ResizeMode.CONTAIN}
                            shouldPlay={false}
                            onError={(error) => console.log('Video playback error:', error)}
                          />

                        ) : item.fileUrl.endsWith('.pdf') ? (
                          <Pressable onPress={() => downloadPdf(`${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}`)} >
                            <Image
                              source={{ uri: `${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}` }} // Thumbnail placeholder
                              style={{ width: 30, height: 10, borderRadius: 10 }}
                            />
                            <Text style={{ textAlign: 'center', color: 'blue' }}>Download PDF</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => onMediaClick(`${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}`, false)}>
                            <Image
                              source={{ uri: `${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}` }}
                              style={{ width: 100, height: 100, borderRadius: 10 }}
                            />
                          </Pressable>
                        )
                      )}

                    </View>
                    {isCurrentUser && (
                      <View style={styles.initialsContainer}>
                        <Text style={styles.initials}>{initials}</Text>
                      </View>
                    )}
                  </View>
                );
              }}
              keyExtractor={(item) => item._id}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
          </View>


          {selectedImageUri && (
            <Modal
              visible={isModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setModalVisible(false)}
            >
              {selectedImageUri.endsWith('.mp4') || selectedImageUri.endsWith('.mov') ? (
                <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
                  <Video
                    source={{ uri: selectedImageUri }}
                    style={{ width: 300, height: 200 }} // Dimensions fixes pour un rendu cohérent
                    useNativeControls={true}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={true}
                    onError={(error) => {
                      Alert.alert('Erreur', 'Impossible de lire la vidéo. Veuillez réessayer.');
                    }}
                  />
                  <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Icon name="times-circle" size={30} color="white" />
                  </Pressable>
                </View>
              ) : selectedImageUri.endsWith('.pdf') ? (
                <View style={[styles.modalContainer, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
                  <Pressable onPress={() => downloadPdfWeb(selectedImageUri)} style={styles.downloadContainer}>
                    <Text style={styles.downloadText}>
                      {parsedUser.language === 'English' ? 'Click to Download PDF' : 'Cliquez pour télécharger le PDF'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Icon name="times-circle" size={30} color="white" />
                  </Pressable>
                </View>
              ) : (
                <ImageViewer
                  imageUrls={[{ url: selectedImageUri }]}
                  enableSwipeDown={true}
                  onSwipeDown={() => setModalVisible(false)}
                  renderHeader={() => (
                    <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                      <Icon name="times-circle" size={30} color="white" />
                    </Pressable>
                  )}
                />
              )}
            </Modal>
          )}




          {/* Image preview section */}
          {fileUri && (
            <View style={styles.imagePreviewContainer}>
              {fileUri.endsWith('.mp4') || fileUri.endsWith('.mov') ? (
                <Video
                  source={{ uri: fileUri }}
                  style={styles.imagePreview}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              ) : (
                <Image source={{ uri: fileUri }} style={styles.imagePreview} />
              )}
              <Pressable style={styles.clearButton} onPress={clearFile}>
                <Icon name="times-circle" size={24} color="red" />
              </Pressable>
            </View>
          )}


          {/* Icons for image upload and audio messages */}
          <View style={styles.iconContainer}>
            <Pressable style={styles.iconButton} onPress={pickPicture}>
              <Icon name="image" size={24} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={pickVideo}>
              <Icon name="video-camera" size={24} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={pickFile}>
              <Icon name="file" size={24} color="#fff" />
            </Pressable>
          </View>


          {/* Input field and Send button */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { height: Math.min(inputHeight, 100) }]}
              value={message}
              onChangeText={setMessage}
              placeholder={parsedUser.language === 'English' ? 'Type your message here...' : 'Tapez votre message ici...'}
              placeholderTextColor="#ccc"
              multiline={true}
              onContentSizeChange={(event) => setInputHeight(event.nativeEvent.contentSize.height)}
            />
            <Pressable
              style={[
                styles.sendButton,
                { opacity: isSending ? 0.5 : 1 },
              ]}
              onPress={isSending ? null : sendMessage} // Désactiver le clic pendant l'envoi
              disabled={isSending}
            >
              {isSending ? (
                <Text style={styles.sendButtonText}>
                  {parsedUser.language === 'English' ? 'Sending...' : 'Envoi...'}
                </Text>
              ) : (
                <Text style={styles.sendButtonText}>
                  {parsedUser.language === 'English' ? 'Send' : 'Envoyer'}
                </Text>
              )}
            </Pressable>

          </View>
        </View>
      )}

      {Platform.OS === "web" && (
        <View style={{ flex: 1, position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#001933" }}>
          <View style={styles.conversationContainer}>
            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            >
              {messages.map((item) => {
                const isCurrentUser = item.senderId === parsedUser._id;
                const sender = isCurrentUser ? parsedUser : participants.find(p => p._id === item.senderId);
                const initials = sender ? getInitials(parsedUser.name, parsedUser.familyName) : '?';

                return (
                  <View key={item._id} style={[styles.messageRow, isCurrentUser ? styles.currentUserRow : styles.otherUserRow]}>
                    {!isCurrentUser && (
                      <View style={styles.initialsContainer}>
                        <Text style={styles.initials}>{initials}</Text>
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageContainer,
                        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage,
                      ]}
                    >
                      {item.content && (
                        <AutoLink
                          text={item.content} // Utilisez la propriété 'text' pour afficher le contenu
                          linkDefault={true}
                          linkStyle={{ color: '#FFA500', textDecorationLine: 'underline' }}
                          style={[
                            styles.messageText,
                            isCurrentUser ? styles.currentUserText : styles.otherUserText,
                          ]}
                        />
                      )}

                      {/* Updated rendering logic */}
                      {item.fileUrl && (

                        item.fileUrl.endsWith('.mp4') || item.fileUrl.endsWith('.mov') ? (
                          <Pressable onPress={() => onMediaClick(`${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}`, true)}>
                            <video
                              src={`${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}`}
                              controls
                              style={{ width: 200, height: 200, borderRadius: 10 }}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </Pressable>
                        ) : item.fileUrl.endsWith('.pdf') ? (
                          <Pressable onPress={() => downloadPdf(`${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}`)}>
                            <Image
                              source={{ uri: `${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}` }} // Optional thumbnail for PDF
                              style={{ width: 50, height: 10, borderRadius: 10 }}
                            />
                            <Text style={{ textAlign: 'center', marginTop: 5, color: 'blue' }}>Download PDF</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => onMediaClick(`${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}`, false)}>
                            <Image
                              source={{ uri: `${AppURL}${item.fileUrl}?dsp_code=${parsedUser.dsp_code}` }}
                              style={{ width: 200, height: 200, borderRadius: 10 }}
                            />
                          </Pressable>
                        )
                      )}


                    </View>

                    {isCurrentUser && (
                      <View style={styles.initialsContainer}>
                        <Text style={styles.initials}>{initials}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>


          {/* Modal for image, video, or PDF enlargement with download functionality */}
          {selectedImageUri && (
            <Modal visible={isModalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
              {selectedImageUri.endsWith('.mp4') || selectedImageUri.endsWith('.mov') ? (
                <View style={styles.modalContainer}>
                  <Video
                    source={{ uri: selectedImageUri }}
                    style={{ width: '100%', height: '100%' }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                  />
                  <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Icon name="times-circle" size={30} color="white" />
                  </Pressable>
                </View>
              ) : selectedImageUri.endsWith('.pdf') ? (
                <View style={styles.modalContainer}>
                  {/* Trigger download on click */}
                  <Pressable onPress={() => downloadPdfWeb(selectedImageUri)} style={styles.downloadContainer}>
                    <Text style={styles.downloadText}>
                      {parsedUser.language === 'English' ? 'Click to Download PDF' : 'Cliquez pour télécharger le PDF'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Icon name="times-circle" size={30} color="white" />
                  </Pressable>
                </View>
              ) : (
                <ImageViewer
                  imageUrls={[{ url: selectedImageUri }]}
                  enableSwipeDown={true}
                  onSwipeDown={() => setModalVisible(false)}
                  renderHeader={() => (
                    <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                      <Icon name="times-circle" size={30} color="white" />
                    </Pressable>
                  )}
                />
              )}
            </Modal>
          )}




          {/* Image preview section */}
          {fileUri && (
            <View style={styles.imagePreviewContainer}>
              {fileUri.endsWith('.mp4') || fileUri.endsWith('.mov') ? (
                <Video
                  source={{ uri: fileUri }}
                  style={{ width: '70%', height: '70%' }}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                />
              ) : (
                <Image source={{ uri: fileUri }} style={styles.imagePreview} />
              )}
              <Pressable style={styles.clearButton} onPress={clearFile}>
                <Icon name="times-circle" size={24} color="red" />
              </Pressable>
            </View>
          )}


          {/* Icons for image upload and audio messages */}
          <View style={styles.iconContainer}>
            <Pressable style={styles.iconButton} onPress={pickPicture}>
              <Icon name="image" size={24} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={pickVideo}>
              <Icon name="video-camera" size={24} color="#fff" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={pickFile}>
              <Icon name="file" size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Input field and Send button */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { height: Math.min(inputHeight, 100) }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Type your message..."
              placeholderTextColor="#ccc"
              multiline={true}
              onContentSizeChange={(event) => setInputHeight(event.nativeEvent.contentSize.height)}
            />
            <Pressable
              style={[
                styles.sendButton,
                { opacity: isSending ? 0.5 : 1 },
              ]}
              onPress={isSending ? null : sendMessage} // Désactiver le clic pendant l'envoi
              disabled={isSending}
            >
              {isSending ? (
                <Text style={styles.sendButtonText}>
                  {parsedUser.language === 'English' ? 'Sending...' : 'Envoi...'}
                </Text>
              ) : (
                <Text style={styles.sendButtonText}>
                  {parsedUser.language === 'English' ? 'Send' : 'Envoyer'}
                </Text>
              )}
            </Pressable>

          </View>
        </View>
      )}
    </>
  );
}

// Styles
const styles = StyleSheet.create({
  downloadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  downloadText: {
    fontSize: 18,
    color: '#00f',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',

  },
  enlargedImage: {
    width: '90%',
    height: '70%',
    borderRadius: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 40, // Adjust as needed to place it within view
    right: 20, // Adjust as needed
    zIndex: 10, // Ensure this is high enough to overlay on other content
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Optional for better visibility
    padding: 10,
    borderRadius: 50,
  },
  downloadButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 5,
  },
  downloadButtonText: {
    color: '#001933',
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginBottom: 10,
    maxWidth: '80%',
    alignSelf: 'center',
  },
  imagePreview: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 10,
  },
  clearButton: {
    padding: 5,
    backgroundColor: '#ffffff',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#001933',
  },
  conversationContainer: {
    flex: 1,
    borderColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 15,
    padding: 10,
    backgroundColor: '#ffffff',
    marginBottom: 50,
    marginTop: 50,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  currentUserRow: {
    justifyContent: 'flex-end',
  },
  otherUserRow: {
    justifyContent: 'flex-start',
  },
  initialsContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    marginTop: 30,
  },
  initials: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 10,
  },
  messageContainer: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '75%',
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#001933',
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6e6e6',
  },
  messageText: {
    fontSize: 16,
  },
  currentUserText: {
    color: '#ffffff',
  },
  otherUserText: {
    color: '#333',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginTop: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,

  },
  input: {
    flex: 1,
    minHeight: 50,
    maxHeight: 100,
    borderColor: '#ffffff',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    color: '#333',
    marginBottom: 45,
  },
  sendButton: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginLeft: 10,
    marginBottom: 45,
  },
  sendButtonText: {
    color: '#001933',
    textAlign: 'center',
    fontSize: 16,
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconButton: {
    padding: 10,
    backgroundColor: '#001933',
    borderRadius: 10,
  },
});
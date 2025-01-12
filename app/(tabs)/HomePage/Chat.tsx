import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Platform, ScrollView, Pressable, Image, Modal, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
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
import * as MediaLibrary from 'expo-media-library';



const windowHeight = Dimensions.get('window').height;

// Initialize the socket
const socket = io('http://192.168.12.12:3004');
const URLEMployees = 'https://coral-app-wqv9l.ondigitalocean.app';
const URLConversation = 'http://192.168.12.12:3004';

// Message type definition
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
  const route = useRoute();
  const { conversationId, user, participantIds } = route.params as {
    conversationId: string;
    user: User;
    participantIds: string[];  // Définir participantIds comme un tableau de chaînes
  };


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
  

  useEffect(() => {
    const socket = io(`http://192.168.12.12:3004`, {
      query: { dsp_code: user.dsp_code }, // Remplacez par une valeur valide
    });
    // Fetch initial data once
    const initializeData = async () => {
      await fetchConversationParticipants();
      await fetchMessages();


    };
    initializeData();

    // Listen for new messages
    socket.on('newMessage', (newMessage: Message) => {
      if (newMessage.conversationId === conversationId) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
        setNewMessageReceived(true); // Mark that a new message has arrived
      }
    });

    return () => {
      socket.off('newMessage');
      socket.disconnect();
    };
  }, [conversationId]);

  useEffect(() => {
    if (participants.length > 0) {
      console.log('Updated participants:', participants); // Log updated participants after state change
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
      const response = await axios.get(`http://192.168.12.12:3004/api/messages/${conversationId}?dsp_code=${user.dsp_code}`);
      setMessages(response.data);
      if (Platform.OS === 'web') {
        scrollViewRef.current?.scrollToEnd({ animated: true }); // Scroll to the bottom on web
      } else {
        flatListRef.current?.scrollToEnd({ animated: true }); // Scroll to the bottom on mobile
      }
    } catch (error) {
      console.error('Error fetching messages', error);
    }
  };

  // Fetch conversation participants
  const fetchConversationParticipants = async () => {
    try {
      // Exclude the current user's ID to only retrieve other participants
      const otherParticipantIds = participantIds.filter(id => id !== user._id);

      if (otherParticipantIds.length === 0) return; // Check if there are participants to fetch

      // Make a single request with all participant IDs
      const response = await axios.post(`${URLEMployees}/api/employee/by-ids?dsp_code=${user.dsp_code}`, { // URL is fine with backticks
        ids: otherParticipantIds // Send the IDs as data in the POST request
      });
      // Update the state with the fetched participant data
      setParticipants(response.data as User[]);

    } catch (error) {
      console.error('Error fetching participants', error);
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
        console.log("Processed video URL:", videoUrl);

        // If needed, append videoFile to FormData for uploading
      } else {
        // Directly use the URI for mobile platforms
        setFileUri(videoUri);
        console.log("Processed video URL mobile:", videoUri);
      }
    }
  };



  // Fonction pour choisir un fichier
  const pickPicture = async () => {
    let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Permission d'accès à la galerie requise !");
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setFileUri(result.assets[0].uri); // Stockez l'URI du fichier sélectionné
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
        console.log('Sélection de fichier annulée ou aucun fichier trouvé');
      }
    } catch (error) {
      console.error('Erreur lors de la sélection du fichier:', error);
    }
  };

  const downloadPdf = async (fileUrl: string) => {
    if (Platform.OS === 'web') {
      downloadPdfWeb(fileUrl);
    } else {
      const fileName = fileUrl.split('/').pop() ?? 'download.pdf';
      const downloadPath = `${FileSystem.cacheDirectory}${fileName}`;

      try {
        // Download the file to the cache directory
        const { uri } = await FileSystem.downloadAsync(fileUrl, downloadPath);
        // Move the file to the document directory for better access
        const movedUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.moveAsync({ from: uri, to: movedUri });

        // Check if the file exists
        const fileInfo = await FileSystem.getInfoAsync(movedUri);
        if (!fileInfo.exists) {
          throw new Error('Moved file does not exist or is inaccessible.');
        }

        // Request permissions to save the file to the media library
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Storage permissions are required to save the file.');
          return;
        }

        // Save the file directly to the library
        await MediaLibrary.saveToLibraryAsync(movedUri);
        Alert.alert('Download Complete', 'File has been saved to your library.');

      } catch (error) {
        if (error instanceof Error) {
          console.error('Download error:', error.message);
          Alert.alert('Error', `An error occurred while saving the file: ${error.message}`);
        } else {
          console.error('Download error:', error);
          Alert.alert('Error', 'An unexpected error occurred.');
        }
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
      console.error('Error downloading file:', error);
      alert('An error occurred while downloading the file.');
    }
  };




  // Fonction pour envoyer des messages (texte et/ou fichier - image, vidéo ou document)
  const sendMessage = async () => {
    if (!message.trim() && !fileUri) return; // Quitte si aucun message ou fichier n'est fourni

    // Création des données du message
    const messageData = {
      conversationId,
      senderId: user._id,
      content: message.trim() || '',
      senderName: user.name,
      senderfamilyName: user.familyName,
      participants,
    };

    // Création de l'objet FormData pour l'envoi
    const formData = new FormData();
    formData.append('messageData', JSON.stringify(messageData));

    // Ajout du fichier s'il est présent
    if (fileUri) {
      // console.log("fileUri :"+fileUri) ;

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
            console.error('URI non pris en charge:', fileUri);
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
        console.error('Erreur lors de la préparation du fichier pour l\'envoi:', error);
        return; // Quitte s'il y a une erreur de préparation du fichier
      }
    }

    try {
      // Log les données du FormData avant l'envoi
      formData.forEach((value, key) => {
        console.log(`${key}: ${value}`);
      });

      const response = await fetch(`http://192.168.12.12:3004/api/messages/upload?dsp_code=${user.dsp_code}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        console.error("Request failed:", response.statusText);
      }

      if (response.status===201) {
        const savedMessage = await response.json();
        socket.emit('newMessage', savedMessage); // Émission du nouveau message via Socket.IO
        setMessage(''); // Réinitialisation du champ de message
        setFileUri(null); // Réinitialisation de l'URI du fichier
      } else {
        console.error('Échec de l\'envoi du message:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      if (error instanceof Error) {
        console.error('Message d\'erreur:', error.message);
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
                const isCurrentUser = item.senderId === user._id;
                const sender = isCurrentUser ? user : participants.find(p => p._id === item.senderId);
                const initials = sender ? getInitials(sender.name, sender.familyName) : '?';

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
                          <Pressable onPress={() => onMediaClick(`http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}`, true)}>
                            <Video
                              source={{ uri: `http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}` }}
                              style={{ width: 100, height: 100, borderRadius: 10 }}
                              useNativeControls
                              resizeMode={ResizeMode.CONTAIN}
                              shouldPlay={false}
                              onError={(error) => console.log('Video playback error:', error)}
                            />
                          </Pressable>


                        ) : item.fileUrl.endsWith('.pdf') ? (
                          <Pressable onPress={() => downloadPdf(`http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}`)} >
                            <Image
                              source={{ uri: `http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}` }} // Thumbnail placeholder
                              style={{ width: 30, height: 10, borderRadius: 10 }}
                            />
                            <Text style={{ textAlign: 'center', color: 'blue' }}>Download PDF</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => onMediaClick(`http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}`, false)}>
                            <Image
                              source={{ uri: `http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}` }}
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
            <Modal visible={isModalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
              {selectedImageUri.endsWith('.mp4') || selectedImageUri.endsWith('.mov') ? (
                <View style={styles.modalContainer}>
                  <Video
                    source={{ uri: selectedImageUri }}
                    style={{ width: "90%", height: "90%" }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={true}
                    onError={(error) => {
                      console.log('Video playback error in modal:', error);
                      Alert.alert('Error', 'Unable to play the video.');
                    }}
                  />
                  <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Icon name="times-circle" size={30} color="white" />
                  </Pressable>
                </View>
              ) : selectedImageUri.endsWith('.pdf') ? (
                <View style={styles.modalContainer}>
                  <Pressable onPress={() => downloadPdfWeb(selectedImageUri)} style={styles.downloadContainer}>
                    <Text style={styles.downloadText}>
                      {user.language === 'English' ? 'Click to Download PDF' : 'Cliquez pour télécharger le PDF'}
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
              placeholder={user.language === 'English' ? 'Type your message here...' : 'Tapez votre message ici...'}
              placeholderTextColor="#ccc"
              multiline={true}
              onContentSizeChange={(event) => setInputHeight(event.nativeEvent.contentSize.height)}
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                { opacity: pressed ? 0.7 : 1 }  // Applique l'effet d'opacité sur mobile
              ]}
              onPress={sendMessage}
              android_ripple={{ color: 'rgba(0, 0, 255, 0.3)' }} // Effet ripple pour Android
            >
              <Text style={styles.sendButtonText}>
                {user.language === 'English' ? 'Send' : 'Envoyer'}
              </Text>
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
                const isCurrentUser = item.senderId === user._id;
                const sender = isCurrentUser ? user : participants.find(p => p._id === item.senderId);
                const initials = sender ? getInitials(sender.name, sender.familyName) : '?';

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
                          <Pressable onPress={() => onMediaClick(`http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}`, true)}>
                            <video
                              src={`http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}`}
                              controls
                              style={{ width: 200, height: 200, borderRadius: 10 }}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </Pressable>
                        ) : item.fileUrl.endsWith('.pdf') ? (
                          <Pressable onPress={() => downloadPdf(`http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}`)}>
                            <Image
                              source={{ uri: 'https://example.com/path-to-your-pdf-thumbnail.png' }} // Optional thumbnail for PDF
                              style={{ width: 50, height: 10, borderRadius: 10 }}
                            />
                            <Text style={{ textAlign: 'center', marginTop: 5, color: 'blue' }}>Download PDF</Text>
                          </Pressable>
                        ) : (
                          <Pressable onPress={() => onMediaClick(`http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}`, false)}>
                            <Image
                              source={{ uri: `http://192.168.12.12:3004${item.fileUrl}?dsp_code=${user.dsp_code}` }}
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
                      {user.language === 'English' ? 'Click to Download PDF' : 'Cliquez pour télécharger le PDF'}
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
              style={({ pressed }) => [
                styles.sendButton,
                { opacity: pressed ? 0.4 : 1 }  // Applique l'effet d'opacité sur web
              ]}
              onPress={sendMessage}
            >
              <Text style={styles.sendButtonText}>
                {user.language === 'English' ? 'Send' : 'Envoyer'}
              </Text>
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
    minHeight: 40,
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
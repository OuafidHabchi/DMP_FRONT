import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput, Button, Alert, ScrollView, RefreshControl, ActivityIndicator, Platform, Pressable } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native'; // Pour afficher l'aperçu de l'image
import * as FileSystem from 'expo-file-system';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import des icônes
import * as ImageManipulator from 'expo-image-manipulator';
import AppURL from '@/components/src/URL';
import CameraCaptureButton from '@/components/src/CameraCaptureButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@/context/UserContext';
import { useIsFocused } from '@react-navigation/native';


const URL_ASSIGNMENT = `${AppURL}/api/vanAssignments`;
const URL_TimeCard = `${AppURL}/api/timecards`;

const AssignedVanScreen = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [assignedVanNameForToday, setAssignedVanNameForToday] = useState<string | null>(null);
  const [assignedVanQRForToday, setAssignedVanQRForToday] = useState<string | null>(null);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);
  const [isProblemModalVisible, setIsProblemModalVisible] = useState(false);
  const [problemDescription, setProblemDescription] = useState('');
  const [problemType, setProblemType] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true); // Loading state for data
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null); // New state for end time
  const [cortexDuree, setCortexDuree] = useState<string | null>(null); // New state for end time
  const [cortexEndTime, setCortexEndTime] = useState<string | null>(null); // New state for end time
  const [hasStartedWork, setHasStartedWork] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // État pour stocker l'image sélectionnée
  const [isCameraVisible, setIsCameraVisible] = useState<'prepic' | 'postpic' | false>(false);
  const [prePicStatus, setPrePicStatus] = useState<string | null>(null);
  const [postPicStatus, setPostPicStatus] = useState<string | null>(null);
  const setFileUri = (uri: string) => {
    setSelectedImage(uri);
  };

  // Fonction pour ouvrir directement la caméra (remplace pickPicture)
  const captureIssuePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        user?.language === 'English'
          ? "Camera permission is required!"
          : "L'autorisation de la caméra est requise !"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 500 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      setSelectedImage(manipulatedImage.uri); // Aperçu de l'image
    }
  };



  const fetchTodayVanAssignment = async () => {
    try {
      setLoading(true);
      const today = new Date().toDateString();
      const response = await axios.get(`${URL_ASSIGNMENT}/date/${today}?dsp_code=${user?.dsp_code}`);
      const assignments = response.data as Array<{ employeeId: string; vanId: string; date: string }>;
      const todaysAssignment = assignments.find(assignment => assignment.employeeId === user?._id);

      if (todaysAssignment) {
        const vanResponse = await axios.get(`${AppURL}/api/vehicles/${todaysAssignment.vanId}?dsp_code=${user?.dsp_code}`);
        setAssignedVanNameForToday(vanResponse.data.data?.vehicleNumber || "Unknown Van");
        setAssignedVanQRForToday(vanResponse.data.data?.vin || "");
      } else {
        setAssignedVanNameForToday(null); // No van assigned
      }
    } catch (error) {
      console.error("Error fetching van assignment:", error);
    } finally {
      setLoading(false); // Stop loading after data fetch
    }
  };

  const checkExistingTimeCard = async () => {
    const today = new Date().toDateString();
    try {
      const response = await axios.get(`${URL_TimeCard}/timecards/${user?._id}/${today}?dsp_code=${user?.dsp_code}`);
      if (response.data) {
        setStartTime(response.data.startTime || null); // Set start time if available
        setEndTime(response.data.endTime || null);     // Set end time if available
        setHasStartedWork(!!response.data.startTime); // Work has started if startTime exists
        setCortexDuree(response.data.CortexDuree || null);
        setCortexEndTime(response.data.CortexEndTime || null);

      } else {
        setHasStartedWork(false);  // No timecard found
      }
    } catch (error) {
      console.log('Error fetching time card:', error);
      setHasStartedWork(false);
    }
  };



  const handleStartWork = async () => {
    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    setStartTime(currentTime);
    setHasStartedWork(true);

    const today = new Date().toDateString();

    try {
      await axios.put(`${URL_TimeCard}/timecards/${user?._id}/${today}?dsp_code=${user?.dsp_code}`, {
        startTime: currentTime,
      });

      // ✅ Met à jour AsyncStorage
      await AsyncStorage.setItem('prepic', 'true');
      await AsyncStorage.setItem('postpic', 'false');

      // ✅ Met à jour immédiatement les états
      setPrePicStatus('true');
      setPostPicStatus('false');

      // ✅ Rafraîchissement immédiat des statuts
      await refreshPhotoStatus();
    } catch (error) {
      console.error("Error starting work:", error);
    }
  };




  const handleEndWork = async () => {
    // Récupère l'heure de fin de travail au format HH:MM
    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    // Met à jour l'état local avec l'heure de fin
    setEndTime(currentTime);

    // Alerte pour informer l'utilisateur que la journée de travail est terminée
    Alert.alert(
      user?.language === 'English' ? "Work Ended" : "Travail terminé",
      user?.language === 'English'
        ? `You ended work at: ${currentTime}`
        : `Vous avez terminé le travail à : ${currentTime}`
    );

    // Formate la date du jour au format "Sun Oct 20 2024"
    const today = new Date().toDateString();

    try {
      // Envoie une requête PUT pour mettre à jour la fiche de temps avec l'heure de fin
      await axios.put(`${URL_TimeCard}/timecards/${user?._id}/${today}?dsp_code=${user?.dsp_code}`, {
        endTime: currentTime, // Heure de fin au format HH:MM
      });
      // ✅ Vider les statuts PrePic/PostPic après la fin de journée
      await AsyncStorage.removeItem('prepic');
      await AsyncStorage.removeItem('postpic');
      setPrePicStatus(null);
      setPostPicStatus(null);

    } catch (error) {
      console.error("Error ending work:", error);
    }
  };

  const submitProblemReport = () => {
    if (Platform.OS === 'web') {
      submitProblemReportWeb();
    } else {
      submitProblemReportMobile();
    }
  };

  const submitProblemReportWeb = async () => {
    if (!problemDescription) {
      Alert.alert(
        user?.language === 'English' ? "Error" : "Erreur",
        user?.language === 'English'
          ? "Please enter a description of the problem."
          : "Veuillez entrer une description du problème."
      );
      return;
    }
    setIsSubmitting(true); // Active l'effet de chargement

    const formData = new FormData();
    formData.append("problemDescription", problemDescription);
    formData.append("problemType", problemType || "");
    formData.append(
      "employee",
      JSON.stringify({
        familyName: user?.familyName,
        name: user?.name,
      })
    );
    formData.append("assignedVanNameForToday", assignedVanNameForToday || "");
    formData.append("today", new Date().toDateString());
    formData.append("expoPushToken", user?.expoPushToken ?? "");
    formData.append("role", user?.role ?? "");

    if (selectedImage) {
      try {
        const response = await fetch(`${selectedImage}?dsp_code=${encodeURIComponent(user?.dsp_code ?? "")}`); // Ajouter dsp_code dans la requête de récupération de l'image
        const fileBlob = await response.blob();
        const filename = selectedImage.split('/').pop() || 'upload.jpg';
        const mimeType = fileBlob.type;
        formData.append('photo', new File([fileBlob], filename, { type: mimeType }));
        setIsSubmitting(false); // Désactive l'effet de chargement

      } catch (error) {
        console.error("Error processing the image on web:", error);
        Alert.alert("Error", "Failed to process the image.");
        setIsSubmitting(false); // Désactive l'effet de chargement

        return;
      }
    }

    try {
      const response = await fetch(`${AppURL}/api/dailyNotes/create?dsp_code=${user?.dsp_code}`, {
        method: 'POST',
        body: formData, // FormData automatically sets the correct headers
      });

      if (response.ok) {
        setIsSubmitting(false); // Désactive l'effet de chargement
        Alert.alert(
          user?.language === 'English' ? "Success" : "Succès",
          user?.language === 'English'
            ? "Your note has been sent to dispatch."
            : "Votre note a été envoyée au répartiteur."
        );
        setProblemDescription('');
        setProblemType(null);
        setSelectedImage(null);
        setIsProblemModalVisible(false);
      } else {
        setIsSubmitting(false); // Désactive l'effet de chargement
        console.error("Error submitting problem report:", response.status, response.statusText);
        Alert.alert(
          user?.language === 'English' ? "Error" : "Erreur",
          user?.language === 'English'
            ? "Failed to submit the problem report."
            : "Échec de la soumission du rapport de problème."
        );
      }
    } catch (error) {
      setIsSubmitting(false); // Désactive l'effet de chargement
      console.error("Error submitting problem report on web:", error);
      Alert.alert(
        user?.language === 'English' ? "Error" : "Erreur",
        user?.language === 'English'
          ? "An unexpected error occurred."
          : "Une erreur inattendue est survenue."
      );
    }
  };



  const submitProblemReportMobile = async () => {
    if (!problemDescription) {
      Alert.alert(
        user?.language === 'English' ? "Error" : "Erreur",
        user?.language === 'English'
          ? "Please enter a description of the problem."
          : "Veuillez entrer une description du problème."
      );
      return;
    }
    setIsSubmitting(true); // Désactive l'effet de chargement
    const currentTime = new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const formData = new FormData();
    formData.append("problemDescription", problemDescription);
    formData.append("problemType", problemType || "");
    formData.append(
      "employee",
      JSON.stringify({
        familyName: user?.familyName,
        name: user?.name,
      })
    );
    formData.append("assignedVanNameForToday", assignedVanNameForToday || "");
    formData.append("today", new Date().toDateString());
    formData.append("expoPushToken", user?.expoPushToken ?? "");
    formData.append("role", user?.role ?? "");
    formData.append("time", currentTime); // Ajouter l'heure actuelle

    if (selectedImage) {
      try {
        const filename = selectedImage.split('/').pop() || 'upload.jpg';
        const fileType = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType =
          fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png'
            ? `image/${fileType === 'jpg' ? 'jpeg' : fileType}`
            : fileType === 'mp4' || fileType === 'mov'
              ? `video/${fileType}`
              : 'application/octet-stream';

        const fileInfo = await FileSystem.getInfoAsync(selectedImage);
        if (fileInfo.exists) {
          formData.append('photo', {
            uri: fileInfo.uri,
            name: filename,
            type: mimeType,
          } as any);
        } else {
          setIsSubmitting(false); // Désactive l'effet de chargement
          Alert.alert("Error", "File not found.");
          return;
        }
      } catch (error) {
        setIsSubmitting(false); // Désactive l'effet de chargement
        console.error("Error processing the image on mobile:", error);
        Alert.alert("Error", "Failed to process the image.");
        return;
      }
    }

    try {
      const response = await fetch(`${AppURL}/api/dailyNotes/create?dsp_code=${user?.dsp_code}`, {
        method: 'POST',
        body: formData,
        headers: {}, // Laissez-le vide

      });

      if (response.ok) {
        setIsSubmitting(false); // Désactive l'effet de chargement
        Alert.alert(
          user?.language === 'English' ? "Success" : "Succès",
          user?.language === 'English'
            ? "Your note has been sent to dispatch."
            : "Votre note a été envoyée au répartiteur."
        );
        setProblemDescription('');
        setProblemType(null);
        setSelectedImage(null);
        setIsProblemModalVisible(false);
      } else {
        setIsSubmitting(false); // Désactive l'effet de chargement
        console.error("Error submitting problem report:", response.status, response.statusText);
        Alert.alert(
          user?.language === 'English' ? "Error" : "Erreur",
          user?.language === 'English'
            ? "Failed to submit the problem report."
            : "Échec de la soumission du rapport de problème."
        );
      }
    } catch (error) {
      setIsSubmitting(false); // Désactive l'effet de chargement
      console.error("Error submitting problem report on mobile:", error);
      Alert.alert(
        user?.language === 'English' ? "Error" : "Erreur",
        user?.language === 'English'
          ? "An unexpected error occurred."
          : "Une erreur inattendue est survenue."
      );
    }
  };





  const isFocused = useIsFocused();

  // ✅ Fonction pour relire immédiatement AsyncStorage
  const refreshPhotoStatus = async () => {
    const prePic = await AsyncStorage.getItem('prepic');
    const postPic = await AsyncStorage.getItem('postpic');
    setPrePicStatus(prePic);
    setPostPicStatus(postPic);
  };

  // ✅ Fonction pour reset des statuts chaque jour
  const checkDateReset = async () => {
    const today = new Date().toDateString();
    const lastDate = await AsyncStorage.getItem('last_work_date');
    if (lastDate !== today) {
      // Nouvelle journée : Réinitialiser
      await AsyncStorage.removeItem('prepic');
      await AsyncStorage.removeItem('postpic');
      await AsyncStorage.setItem('last_work_date', today);
      refreshPhotoStatus();
    }
  };

  // ✅ UseEffect combiné pour toutes les mises à jour
  useEffect(() => {
    const fetchData = async () => {
      // Récupère les infos du Van et de la fiche de temps
      await Promise.all([
        fetchTodayVanAssignment(),
        checkExistingTimeCard(),
      ]);

      // Vérifie et applique la réinitialisation quotidienne
      await checkDateReset();

      // Rafraîchit les statuts de PrePic/PostPic
      await refreshPhotoStatus();
    };

    // ✅ Rafraîchissement automatique si on revient sur la page
    if (isFocused) {
      fetchData();
    }
  }, [isFocused]);


  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // Vérifier les données et les statuts de photo à chaque actualisation
    Promise.all([
      fetchTodayVanAssignment(),  // Récupère les informations du van assigné
      checkExistingTimeCard(),    // Vérifie les informations de la fiche de temps
    ])
      .then(async () => {
        // Vérifier à nouveau les statuts de prepic et postpic dans le local storage
        const prePicStatus = await AsyncStorage.getItem('prepic');
        const postPicStatus = await AsyncStorage.getItem('postpic');

        // Mettre à jour les états avec les valeurs récupérées
        setPrePicStatus(prePicStatus);
        setPostPicStatus(postPicStatus);
      })
      .finally(() => setRefreshing(false));  // Arrêter le rafraîchissement après avoir terminé
  }, []);




  const openProblemModal = (type: string) => {
    setProblemType(type);
    setIsProblemModalVisible(true);
  };

  if (loading) {
    // Display loading indicator while fetching data
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001933" />
      </View>
    );
  }

  if (!assignedVanNameForToday) {
    // Display message if no van is assigned
    return (
      <View style={styles.notWorkingContainer}>
        <Text style={styles.notWorkingText}>
          {user?.language === 'English' ? "You're not working today." : "Vous ne travaillez pas aujourd'hui."}
        </Text>
      </View>
    );
  }

  const addMinutesToTime = (time: string, minutesToAdd: number): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes + minutesToAdd, 0);
    const newHours = String(date.getHours()).padStart(2, '0');
    const newMinutes = String(date.getMinutes()).padStart(2, '0');
    return `${newHours}:${newMinutes}`;
  };


  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Show Start Work Button if work hasn't started */}
      {!hasStartedWork ? (
        <TouchableOpacity onPress={handleStartWork} style={styles.startWorkButton}>
          <Text style={styles.startWorkButtonText}>
            {user?.language === 'English' ? 'Start Work' : 'Commencer le travail'}
          </Text>
        </TouchableOpacity>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 }}>
            {/* QR Code Button */}
            <TouchableOpacity onPress={() => setIsQRModalVisible(true)} style={styles.qrButton}>
              <Text style={styles.qrButtonText}>
                {user?.language === 'English' ? 'QR Code' : 'Code QR'}
              </Text>
            </TouchableOpacity>

            {/* Camera Button */}
            {prePicStatus === 'true' && (
              <TouchableOpacity onPress={() => setIsCameraVisible('prepic')} style={styles.qrButton}>
                <Text style={styles.qrButtonText}>
                  {user?.language === 'English' ? 'Take Pre-Pic' : 'Prendre une photo (avant)'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Afficher le bouton Post-Pic si postpic est true */}
            {postPicStatus === 'true' && (
              <TouchableOpacity onPress={() => setIsCameraVisible('postpic')} style={styles.qrButton}>
                <Text style={styles.qrButtonText}>
                  {user?.language === 'English' ? 'Take Post-Pic' : 'Prendre une photo (après)'}
                </Text>
              </TouchableOpacity>
            )}
          </View>


          <View style={styles.headerContainer}>
            <Text style={styles.title}>
              {user?.language === 'English'
                ? `Assigned Van: ${assignedVanNameForToday}`
                : `Van assigné : ${assignedVanNameForToday}`}
            </Text>
          </View>
          <Text style={styles.infoText}>
            {user?.language === 'English' ? `Start Time: ${startTime}` : `Heure de début : ${startTime}`}
          </Text>
          {endTime && (
            <Text style={styles.infoText}>
              {user?.language === 'English' ? `End Time: ${endTime}` : `Heure de fin : ${endTime}`}
            </Text>
          )}
          {cortexDuree && (
            <Text style={[styles.infoText, styles.redText]}>
              {user?.language === 'English'
                ? `Trip Duration: ${cortexDuree} min`
                : `Durée du trajet : ${cortexDuree} min`}
            </Text>
          )}
          {cortexEndTime && (
            <Text style={[styles.infoText, styles.redText]}>
              {user?.language === 'English'
                ? `Prediction End Time: ${addMinutesToTime(cortexEndTime, 30)}`
                : `Heure de fin prédiction : ${addMinutesToTime(cortexEndTime, 30)}`}
            </Text>
          )}



          <TouchableOpacity onPress={() => openProblemModal('vehicle')} style={styles.problemButton}>
            <Text style={styles.problemButtonText}>
              {user?.language === 'English' ? 'Report Vehicle Issue' : 'Signaler un problème de véhicule'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openProblemModal('road')} style={styles.problemButton}>
            <Text style={styles.problemButtonText}>
              {user?.language === 'English' ? 'Report Road Issue' : 'Signaler un problème de route'}
            </Text>
          </TouchableOpacity>

          {/* End Work Button */}
          {!endTime && (
            <TouchableOpacity onPress={handleEndWork} style={styles.endWorkButton}>
              <Text style={styles.endWorkButtonText}>
                {user?.language === 'English' ? 'End Work' : 'Terminer le travail'}
              </Text>
            </TouchableOpacity>

          )}

        </>
      )}

      {/* QR Code Modal */}
      <Modal visible={isQRModalVisible} animationType="fade" transparent={true}>
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalContainer}>
            {/* Close Button */}
            <TouchableOpacity onPress={() => setIsQRModalVisible(false)} style={styles.qrModalCloseButton}>
              <Icon name="times" size={20} color="#fff" />
            </TouchableOpacity>

            {/* QR Code Display */}
            <View style={styles.qrCodeWrapper}>
              <QRCode value={assignedVanQRForToday || ''} size={200} />
            </View>

            <Text style={styles.qrCodeText}>
              {user?.language === 'English' ? 'Scan the QR code to start your inspection' : 'Scannez le code QR pour commencer votre inspection'}
            </Text>
          </View>
        </View>
      </Modal>
      <Modal visible={isCameraVisible !== false} animationType="slide">
        <View style={{ flex: 1 }}>
          {isCameraVisible !== false && (
            <CameraCaptureButton
              employeeName={user?.name}
              employeeFamilyName={user?.familyName}
              vanName={assignedVanNameForToday || "Unknown Van"}
              dspCode={user?.dsp_code}
              userId={user?._id}
              photoType={isCameraVisible} // 'prepic' ou 'postpic'
              onSuccess={async () => {
                // ✅ Fermer immédiatement le modal
                setIsCameraVisible(false);

                // ✅ Mettre à jour AsyncStorage et les statuts
                if (isCameraVisible === 'prepic') {
                  await AsyncStorage.setItem('prepic', 'false');
                  await AsyncStorage.setItem('postpic', 'true');
                } else if (isCameraVisible === 'postpic') {
                  await AsyncStorage.setItem('postpic', 'false');
                  await AsyncStorage.setItem('prepic', 'false');
                }

                // ✅ Rafraîchir immédiatement les statuts
                await refreshPhotoStatus();
              }}
            />
          )}
        </View>
      </Modal>





      {/* Problem Report Modal */}
      <Modal visible={isProblemModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English'
                ? `Report a ${problemType === 'vehicle' ? 'Vehicle' : 'Road'} Issue`
                : `Signaler un problème de ${problemType === 'vehicle' ? 'véhicule' : 'route'}`}
            </Text>
            {/* Champ de description */}
            <TextInput
              style={styles.input}
              placeholder={
                user?.language === 'English'
                  ? `Describe the ${problemType} issue...`
                  : `Décrivez le problème de ${problemType}...`
              }
              value={problemDescription}
              onChangeText={setProblemDescription}
              multiline
              editable={!isSubmitting} // Désactive le champ pendant la soumission
            />

            {/* Bouton pour sélectionner une image */}
            <Pressable
              onPress={captureIssuePhoto}
              style={({ pressed }) => [
                styles.iconButton,
                { opacity: pressed ? 0.7 : 1 }, // Effet visuel lors du clic
              ]}
              disabled={isSubmitting} // Désactive le bouton pendant la soumission
            >
              <Icon name="camera" size={24} color="#fff" />
            </Pressable>

            {/* Aperçu de l'image sélectionnée */}
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              </View>
            )}

            {/* Indicateur de chargement */}
            {isSubmitting && (
              <ActivityIndicator size="large" color="#001933" style={styles.loadingIndicator} />
            )}

            {/* Boutons de soumission et de fermeture */}
            <View style={styles.buttonContainer}>
              <Button
                title={user?.language === 'English' ? "Submit" : "Soumettre"}
                onPress={submitProblemReport}
                color="green"
                disabled={isSubmitting} // Désactive le bouton pendant la soumission
              />
              <Button
                title={user?.language === 'English' ? "Close" : "Fermer"}
                onPress={() => setIsProblemModalVisible(false)}
                color="red"
                disabled={isSubmitting} // Désactive le bouton pendant la soumission
              />
            </View>
          </View>
        </View>
      </Modal>


    </ScrollView>
  );
};

export default AssignedVanScreen;

const styles = StyleSheet.create({
  // Ajoutez ce style si nécessaire
  loadingIndicator: {
    marginVertical: 10,
  },
  redText: {
    color: 'red',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20, // Slightly increased padding
    backgroundColor: '#EFEFEF', // Softer background color
    justifyContent: 'flex-start'
  },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20
  },
  title: {
    fontSize: 22, // Slightly larger for prominence
    fontWeight: '600', // Semi-bold for readability
    color: '#001933',
    marginVertical: 10, // Consistent spacing
  },
  qrModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Darker overlay for focus
    padding: 20,
  },
  qrModalContainer: {
    backgroundColor: '#FFF',
    width: '90%',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  qrModalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#001933',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  qrCodeWrapper: {
    marginVertical: 20,
    alignItems: 'center',
  },
  qrCodeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: 'bold',
  },
  qrButton: {
    backgroundColor: '#001933',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  qrButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold'
  },
  startWorkButton: {
    backgroundColor: '#001933', // Slightly more vibrant
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // Shadow for Android
  },
  startWorkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  endWorkButton: {
    backgroundColor: '#001933',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 50,
    width: '80%',
  },
  endWorkButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold'
  },
  infoText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: 'bold',
    marginBottom: 30,
  },
  problemButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 10,
    width: '80%',
  },
  problemButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Slightly darker for contrast
  },
  modalContent: {
    width: '90%',
    padding: 25,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700', // Bolder for emphasis
    color: '#333',
    marginBottom: 15,
  },

  input: {
    height: 80,
    borderColor: '#001933',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F5F5F5',
    color: '#333333',
    textAlignVertical: 'top',
    width: '100%',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#001933',
    padding: 10,
    borderRadius: 5
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold'
  },
  notWorkingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  notWorkingText: {
    fontSize: 20,
    color: '#555',
    fontWeight: 'bold'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  imagePickerButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  imagePickerButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  imagePreview: {
    width: 250, // Larger preview
    height: 250,
    borderRadius: 15, // Softer corners
    borderColor: '#DDD',
    borderWidth: 2,
    resizeMode: 'cover',
  },

  iconButton: {
    width: 50,
    height: 50,
    backgroundColor: '#555', // Neutral color for less distraction
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    borderWidth: 1, // Optional border for definition
    borderColor: '#CCC',
  },


});


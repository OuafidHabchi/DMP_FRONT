import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Modal, Pressable, Alert, Platform, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native'; // Pour afficher l'aperçu de l'image
import * as FileSystem from 'expo-file-system';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import des icônes

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

type Warning = {
  photo: any;
  _id: string;
  employeID: string;
  type: string;
  raison: string;
  description: string;
  severity: string;
  date: string;
  read: boolean;
  signature?: boolean;
  startDate?: string;
  endDate: string;
};

const URL_Employee = 'https://coral-app-wqv9l.ondigitalocean.app'; // Replace with your backend URL
const URL_Warnings = 'https://coral-app-wqv9l.ondigitalocean.app'; // Replace with your backend URL

const Warnings = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };

  const [employees, setEmployees] = useState<User[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<User[]>([]);
  const [employeeWarningsCount, setEmployeeWarningsCount] = useState<Record<string, number>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [newWarningModalVisible, setNewWarningModalVisible] = useState(false);
  const [editWarningModalVisible, setEditWarningModalVisible] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState<Warning | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // État pour stocker l'image sélectionnée
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingWarningDetails, setLoadingWarningDetails] = useState(false);
  const [newWarning, setNewWarning] = useState({
    employeID: '',
    type: '',
    raison: '',
    description: '',
    severity: '',
    date: '',
    startDate: '',
    endDate: '',
    read: false,
    signature: false,
    photo: '', // Ne
  });

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployees(); // Re-fetch employee data
    if (selectedEmployee) {
      await fetchWarningsByEmployeeID(selectedEmployee._id); // Re-fetch warnings for the selected employee
    }
    setRefreshing(false);
  }, [selectedEmployee]);

  const showAlert = (message: string, type: 'success' | 'error') => {
    const alertMessage = type === 'success' ? `✔️ Success: ${message}` : `❌ Error: ${message}`;

    if (Platform.OS === 'web') {
      window.alert(alertMessage);
    } else {
      Alert.alert(type === 'success' ? 'Success' : 'Error', alertMessage);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true); // Début du chargement
      const response = await axios.get(`${URL_Employee}/api/employee?dsp_code=${user.dsp_code}`);
      setEmployees(response.data);
      setFilteredEmployees(response.data);
      await fetchWarningsCount(response.data); // Attendez que les décomptes soient récupérés
      setLoading(false); // Fin du chargement
    } catch (error) {
      console.error('Error fetching employees:', error);
      setLoading(false); // Fin du chargement même en cas d'erreur
    }
  };


  const fetchWarningsCount = async (employees: User[]) => {
    const counts: Record<string, number> = {};

    for (const employee of employees) {
      try {
        const response = await axios.get(
          `${URL_Warnings}/api/warnings/wornings/employe/${employee._id}?dsp_code=${user.dsp_code}`
        );
        counts[employee._id] = response.data.length;
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Si le backend retourne 404 (aucun warning trouvé), assigner 0
          counts[employee._id] = 0;
        } else {
          
          
        }
      }
    }

    setEmployeeWarningsCount(counts);
  };


  const fetchWarningsByEmployeeID = async (id: string) => {
    try {
      const response = await axios.get(`${URL_Warnings}/api/warnings/wornings/employe/${id}?dsp_code=${user.dsp_code}`);
      setWarnings(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        // Aucun warning trouvé pour cet employé
        setWarnings([]);
      } else {
        // Log silencieux en cas d'autres erreurs
        console.warn(`Failed to fetch warnings for employee ${id}:`, error.message);
        setWarnings([]);
      }
    }
  };


  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const filtered = employees.filter(employee =>
      employee.name.toLowerCase().includes(text.toLowerCase()) ||
      employee.familyName.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  const handleEmployeeSelect = (employee: User) => {
    setSelectedEmployee(employee);
    fetchWarningsByEmployeeID(employee._id);
    setModalVisible(true);
  };

  const handleWarningSelect = async (warning: Warning) => {
    setLoadingWarningDetails(true); // Démarre l'indicateur de chargement
    setEditWarningModalVisible(true); // Ouvre la modale avec l'indicateur actif

    setTimeout(async () => {
      await fetchWarningDetails(warning._id); // Récupère les détails du warning
      setLoadingWarningDetails(false); // Arrête l'indicateur de chargement
    }, 100); // Petit délai pour garantir le rendu du spinner
  };




  const setFileUri = (uri: string) => {
    setSelectedImage(uri);
  };

  // Function to pick an image
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("Permission to access the gallery is required!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setNewWarning((prev) => ({ ...prev, photo: imageUri }));
      setSelectedImage(imageUri); // Optionnel si vous utilisez selectedImage ailleurs
    }
  };
  const resetForm = () => {
    setNewWarning({
      employeID: '',
      type: '',
      raison: '',
      description: '',
      severity: '',
      date: '',
      startDate: '',
      endDate: '',
      read: false,
      signature: false,
      photo: '',
    });
    setSelectedImage(null); // Réinitialise l'image sélectionnée
  };


  const submitWarning = async () => {
    setIsSubmitting(true); // Démarre le chargement

    if (Platform.OS === 'web') {
      await submitWarningWeb(); // Assurez-vous que cette fonction est async
    } else {
      await submitWarningMobile(); // Assurez-vous que cette fonction est async
    }

    setIsSubmitting(false); // Arrête le chargement
  };



  const submitWarningWeb = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Validation des champs
    if (!newWarning.raison || !newWarning.description || !newWarning.type) {
      showAlert(user.language === 'English' ? "All fields are required" : "Tous les champs sont requis", "error");
      return;
    }

    if (newWarning.type === "suspension") {
      if (!newWarning.startDate || !newWarning.endDate) {
        showAlert(user.language === 'English' ? "Both Start Date and End Date are required for suspension" : "Les deux dates de début et de fin sont requises pour une suspension", "error");
        return;
      }

      const startDate = new Date(newWarning.startDate);
      const endDate = new Date(newWarning.endDate);

      if (startDate < new Date(today)) {
        showAlert(user.language === 'English' ? "Start Date cannot be earlier than the current date" : "La date de début ne peut pas être antérieure à la date actuelle", "error");
        return;
      }
      if (endDate <= startDate) {
        showAlert(user.language === 'English' ? "End Date must be later than Start Date" : "La date de fin doit être ultérieure à la date de début", "error");
        return;
      }
    }


    // Préparation du FormData
    const formData = new FormData();
    formData.append("employeID", selectedEmployee?._id || "");
    formData.append("type", newWarning.type);
    formData.append("raison", newWarning.raison);
    formData.append("description", newWarning.description);
    formData.append("severity", newWarning.type === "suspension" ? "" : newWarning.severity || "");
    formData.append("startDate", newWarning.startDate || "");
    formData.append("endDate", newWarning.endDate || "");
    formData.append("expoPushToken", selectedEmployee?.expoPushToken || "");
    formData.append("date", today);
    formData.append("signature", newWarning.signature ? "true" : "false");
    // Ajout de la photo si elle existe
    if (newWarning.photo) {
      try {
        const response = await fetch(newWarning.photo);
        const fileBlob = await response.blob();
        const filename = newWarning.photo.split("/").pop() || "photo.jpg";
        formData.append("photo", new File([fileBlob], filename, { type: fileBlob.type }));
      } catch (error) {
        console.error("Error processing the image on web:", error);
        showAlert("Failed to process the image", "error");
        return;
      }
    }

    // Envoi au backend
    try {
      const response = await axios.post(`${URL_Warnings}/api/warnings/wornings?dsp_code=${user.dsp_code}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 201) {
        showAlert("The warning has been sent successfully!", "success");
        setNewWarningModalVisible(false);
        fetchWarningsByEmployeeID(selectedEmployee?._id || "");
        resetForm(); // Réinitialise les champs du formulaire
        await fetchWarningsCount(employees); // Update employee warning counts dynamically
      } else {
        console.error("Error submitting warning on web:", response.statusText);
        showAlert("Failed to submit the warning", "error");
      }
    } catch (error) {
      console.error("Error submitting warning on web:", error);
      showAlert("An unexpected error occurred", "error");
    }
  };


  const submitWarningMobile = async () => {
    const today = new Date().toISOString().split("T")[0];
    const startDate = new Date(newWarning.startDate);
    const endDate = new Date(newWarning.endDate);

    // Validation des champs
    if (!newWarning.raison || !newWarning.description || !newWarning.type) {
      showAlert(user.language === 'English' ? "All fields are required" : "Tous les champs sont requis", "error");
      return;
    }

    if (newWarning.type === "suspension") {
      if (!newWarning.startDate || !newWarning.endDate) {
        showAlert(user.language === 'English' ? "Both Start Date and End Date are required for suspension" : "Les deux dates de début et de fin sont requises pour une suspension", "error");
        return;
      }

      const startDate = new Date(newWarning.startDate);
      const endDate = new Date(newWarning.endDate);

      if (startDate < new Date(today)) {
        showAlert(user.language === 'English' ? "Start Date cannot be earlier than the current date" : "La date de début ne peut pas être antérieure à la date actuelle", "error");
        return;
      }
      if (endDate <= startDate) {
        showAlert(user.language === 'English' ? "End Date must be later than Start Date" : "La date de fin doit être ultérieure à la date de début", "error");
        return;
      }
    }


    // Préparation du FormData
    const formData = new FormData();
    formData.append("employeID", selectedEmployee?._id || "");
    formData.append("type", newWarning.type);
    formData.append("raison", newWarning.raison);
    formData.append("description", newWarning.description);
    formData.append("severity", newWarning.type === "suspension" ? "" : newWarning.severity || "");
    formData.append("startDate", newWarning.startDate || "");
    formData.append("endDate", newWarning.endDate || "");
    formData.append("expoPushToken", selectedEmployee?.expoPushToken || "");
    formData.append("date", today);
    formData.append("read", newWarning.read ? "true" : "false");
    formData.append("signature", newWarning.signature ? "true" : "false");

    // Ajout de la photo si elle existe
    if (newWarning.photo) {
      try {
        const filename = newWarning.photo.split('/').pop() || 'upload.jpg';
        const fileType = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType =
          fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png'
            ? `image/${fileType === 'jpg' ? 'jpeg' : fileType}`
            : fileType === 'mp4' || fileType === 'mov'
              ? `video/${fileType}`
              : 'application/octet-stream';

        const fileInfo = await FileSystem.getInfoAsync(newWarning.photo);
        if (fileInfo.exists) {
          formData.append('photo', {
            uri: fileInfo.uri,
            name: filename,
            type: mimeType,
          } as any);
        } else {
          Alert.alert("Error", "File not found.");
          return;
        }
      } catch (error) {
        console.error("Error processing the image:", error);
        showAlert("Failed to process the image", "error");
        return;
      }
    }

    // Envoi au backend
    try {
      const response = await axios.post(`${URL_Warnings}/api/warnings/wornings?dsp_code=${user.dsp_code}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (response.status === 201) {
        showAlert("The warning has been sent successfully!", "success");
        setNewWarningModalVisible(false);
        fetchWarningsByEmployeeID(selectedEmployee?._id || "");
        resetForm(); // Réinitialise les champs du formulaire
      } else {
        console.error("Error submitting warning on mobile:", response.statusText);
        showAlert("Failed to submit the warning", "error");
      }
    } catch (error) {
      console.error("Error submitting warning:", error);
      showAlert("An unexpected error occurred", "error");
    }
  };




  const handleDeleteWarning = async (warningId: string) => {
    try {
      await axios.delete(`${URL_Warnings}/api/warnings/wornings/${warningId}?dsp_code=${user.dsp_code}`);
      setWarnings(warnings.filter((w) => w._id !== warningId));
      showAlert('Warning deleted successfully!', 'success');
      await fetchWarningsCount(employees); // Update employee warning counts dynamically
    } catch (error) {
      console.error('Error deleting warning:', error);
      showAlert('Failed to delete warning. Please try again later.', 'error');
    }
  };

  const handleUpdateWarning = async (updatedWarning: Warning) => {
    // Validation des champs
    if (!updatedWarning.raison || !updatedWarning.description || !updatedWarning.type) {
      showAlert(user.language === 'English' ? "All fields are required" : "Tous les champs sont requis", "error");
      return;
    }

    if (updatedWarning.type === "suspension") {
      if (!updatedWarning.startDate || !updatedWarning.endDate) {
        showAlert(user.language === 'English' ? "Both Start Date and End Date are required for suspension" : "Les deux dates de début et de fin sont requises pour une suspension", "error");
        return;
      }
      if (new Date(updatedWarning.endDate) <= new Date(updatedWarning.startDate)) {
        showAlert(user.language === 'English' ? "End Date must be after Start Date" : "La date de fin doit être après la date de début", "error");
        return;
      }
    }


    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append("raison", updatedWarning.raison.trim());
      formData.append("description", updatedWarning.description.trim());
      formData.append("type", updatedWarning.type);
      formData.append("severity", updatedWarning.severity || "");
      formData.append("startDate", updatedWarning.startDate || "");
      formData.append("endDate", updatedWarning.endDate || "");

      if (removePhoto) {
        formData.append("removePhoto", "true");
      } else if (selectedImage) {
        try {
          const response = await fetch(`${selectedImage}?dsp_code=${encodeURIComponent(user.dsp_code)}`); // Ajouter dsp_code dans la requête de récupération de l'image
          if (!response.ok) {
            throw new Error("Failed to fetch selected image.");
          }
          const blob = await response.blob();
          const filename = selectedImage.split('/').pop() || 'upload.jpg';
          formData.append("photo", blob, filename);
        } catch (error) {
          console.error("Error processing the image:", error);
          showAlert("Failed to process the selected image. Please try again.", "error");
          return;
        }
      }

      // Make the API call
      const response = await axios.put(
        `${URL_Warnings}/api/warnings/wornings/${updatedWarning._id}?dsp_code=${user.dsp_code}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.status === 200) {
        showAlert("Warning updated successfully!", "success");

        // Update the local warnings state
        setWarnings((prevWarnings) =>
          prevWarnings.map((w) => (w._id === updatedWarning._id ? response.data : w))
        );

        // Reset removePhoto and selectedImage
        setRemovePhoto(false);
        setSelectedImage(null);
      } else {
        console.error("Unexpected response:", response);
        showAlert("Failed to update the warning. Please try again later.", "error");
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        // Handle Axios-specific errors
        console.error("Backend error:", err.response?.data || err.message);
        showAlert(err.response?.data?.message || "An error occurred while updating the warning.", "error");
      } else if (err instanceof Error) {
        // Handle general errors
        console.error("Error updating warning:", err.message);
        showAlert("An unexpected error occurred. Please try again later.", "error");
      } else {
        // Fallback for unknown error types
        console.error("Unexpected error:", err);
        showAlert("An unknown error occurred. Please contact support.", "error");
      }
    }

  };





  const fetchWarningDetails = async (warningId: string) => {
    try {
      const response = await axios.get(`${URL_Warnings}/api/warnings/wornings/${warningId}?dsp_code=${user.dsp_code}`);
      const warningData = response.data;

      if (warningData.photo) {
        // Ensure photo is a valid Base64 string
        warningData.photo = warningData.photo; // It should already be Base64 from the backend
      }

      setSelectedWarning(warningData);
    } catch (error) {
      console.error('Error fetching warning details:', error);
      showAlert('Failed to fetch warning details. Please try again later.', 'error');
    }
  };





  const getEmployeeBgColor = (warningCount: number): string => {
    if (warningCount === 0) return '#e8f5e9';
    if (warningCount <= 3) return '#fff8e1';
    return '#ffebee';
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffff" />
          <Text style={styles.loadingText}>
            {user.language === 'English' ? 'Loading Data...' : 'Chargement des données...'}
          </Text>
        </View>
      ) : (
        <>

          <Text style={styles.title}>
            {user.language === 'English' ? 'Warnings Management' : 'Gestion des Avertissements'}
          </Text>

          <TextInput
            style={styles.searchBar}
            placeholder={user.language === 'English' ? 'Search Employee...' : 'Rechercher un employé...'}
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearch}
          />

          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => {
              const warningCount = employeeWarningsCount[item._id] || 0;
              return (
                <TouchableOpacity
                  style={[
                    styles.employeeItem,
                    { backgroundColor: getEmployeeBgColor(warningCount) },
                  ]}
                  onPress={() => handleEmployeeSelect(item)}
                >
                  <Text style={styles.employeeText}>
                    {item.name} {item.familyName} - {user.language === 'English' ? `${warningCount} Warnings` : `${warningCount} Avertissements`}
                  </Text>

                </TouchableOpacity>
              );
            }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </>
      )}

      {selectedEmployee && (
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {user.language === 'English'
                ? `Warnings for ${selectedEmployee.name} ${selectedEmployee.familyName}`
                : `Avertissements pour ${selectedEmployee.name} ${selectedEmployee.familyName}`}
            </Text>

            <FlatList
              data={warnings}
              keyExtractor={(item) => item._id}
              numColumns={2} // Show 2 warnings per row
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.warningItem,
                    { backgroundColor: item.type === 'suspension' ? '#ffebee' : '#fff8e1' } // Red for suspension, Orange for warning
                  ]}
                  onPress={() => handleWarningSelect(item)}
                >
                  {/* Title and Date */}
                  <View style={styles.warningHeader}>
                    <Text style={styles.warningTitle}>{item.raison}</Text>
                    <Text style={styles.warningDate}>{item.date}</Text>
                  </View>

                  {/* Description */}
                  <Text style={styles.warningDescription}>
                    {item.type} {item.type === 'warning' ? item.severity : ''}
                  </Text>

                  {/* Read and Signature Status */}
                  <View style={styles.warningStatusContainer}>
                    {/* Read Status */}
                    <View style={styles.warningBadge}>
                      <Text style={styles.badgeText}>
                        <FontAwesome
                          name={item.read ? 'eye' : 'eye-slash'}
                          size={18}
                          color={item.read ? '#2ecc71' : '#e74c3c'}
                        />
                      </Text>
                    </View>

                    {/* Signature Status (only for warnings) */}
                    {item.type !== 'suspension' && (
                      <View style={styles.warningBadge}>
                        <Text style={styles.badgeText}>
                          <FontAwesome
                            name={item.signature ? 'check-circle' : 'circle'}
                            size={18}
                            color={item.signature ? '#001933' : '#e74c3c'}
                          />
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
            {/* Button to Add a Warning */}
            <TouchableOpacity
              style={styles.floatingButton}
              onPress={() => setNewWarningModalVisible(true)}
            >
              <Text style={styles.floatingButtonText}>+</Text>
            </TouchableOpacity>


            <Pressable style={styles.buttonClose} onPress={() => setModalVisible(false)}>
              <Text style={styles.buttonTextClose}>
                {user.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </Pressable>
          </View>
        </Modal>
      )}

      {newWarningModalVisible && (
        <Modal visible={newWarningModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <ScrollView
                contentContainerStyle={styles.modalScrollViewContent}
                showsVerticalScrollIndicator={false} // Optional: hides the scroll indicator
              >
                <Text style={styles.modalTitle}>
                  {user.language === 'English' ? 'Add New Warning' : 'Ajouter un Nouveau Avertissement'}
                </Text>

                {/* Type Picker */}
                <Picker
                  selectedValue={newWarning.type}
                  style={styles.input}
                  onValueChange={(itemValue) =>
                    setNewWarning({ ...newWarning, type: itemValue })
                  }
                >
                  <Picker.Item label="Select Type" value="" />
                  <Picker.Item label="Warning" value="warning" />
                  <Picker.Item label="Suspension" value="suspension" />
                </Picker>

                {/* Reason Input */}
                <TextInput
                  style={styles.input}
                  placeholder={user.language === 'English' ? 'Reason' : 'Raison'}
                  placeholderTextColor="#888"
                  value={newWarning.raison}
                  onChangeText={(text) => setNewWarning({ ...newWarning, raison: text })}
                />

                {/* Description Input */}
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Description"
                  placeholderTextColor="#888"
                  multiline
                  value={newWarning.description}
                  onChangeText={(text) => setNewWarning({ ...newWarning, description: text })}
                />

                {/* Conditional Inputs */}
                {newWarning.type === 'suspension' ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder={user.language === 'English' ? 'Start Date (e.g., 2024-11-25)' : 'Date de début (ex. : 2024-11-25)'}
                      placeholderTextColor="#888"
                      value={newWarning.startDate}
                      onChangeText={(text) => setNewWarning({ ...newWarning, startDate: text })}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder={user.language === 'English' ? 'End Date (e.g., 2024-11-30)' : 'Date de fin (ex. : 2024-11-30)'}
                      placeholderTextColor="#888"
                      value={newWarning.endDate}
                      onChangeText={(text) => setNewWarning({ ...newWarning, endDate: text })}
                    />
                  </>

                ) : (
                  <Picker
                    selectedValue={newWarning.severity}
                    style={styles.input}
                    onValueChange={(itemValue) =>
                      setNewWarning({ ...newWarning, severity: itemValue })
                    }
                  >
                    <Picker.Item
                      label={user.language === 'English' ? 'Select Severity' : 'Sélectionner la Gravité'}
                      value=""
                    />
                    <Picker.Item label="Low" value="low" />
                    <Picker.Item label="Medium" value="medium" />
                    <Picker.Item label="High" value="high" />
                  </Picker>
                )}

                {/* Image Picker */}
                <TouchableOpacity onPress={pickImage} style={styles.pickImageButton}>
                  <Icon name="camera" size={24} color="#fff" />
                </TouchableOpacity>
                {newWarning.photo ? (
                  <>
                    <Image source={{ uri: newWarning.photo }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.deleteImageButton}
                      onPress={() => {
                        setNewWarning((prev) => ({ ...prev, photo: '' }));
                        setSelectedImage(null);
                      }}
                    >
                      <Text style={styles.deleteImageButtonText}>
                        {user.language === 'English' ? 'Remove Image' : 'Supprimer l\'image'}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={{ textAlign: "center", color: "#888" }}>
                    {user.language === 'English' ? 'No image selected' : 'Aucune image sélectionnée'}
                  </Text>
                )}

                {/* Submit and Cancel Buttons */}
                <Pressable
                  style={[styles.buttonAdd, isSubmitting ? styles.buttonDisabled : null]}
                  onPress={submitWarning}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {user.language === 'English' ? 'Submit' : 'Soumettre'}
                    </Text>
                  )}
                </Pressable>
                <Pressable
                  style={styles.buttonClose}
                  onPress={() => setNewWarningModalVisible(false)}
                >
                  <Text style={styles.buttonTextClose}>
                    {user.language === 'English' ? 'Cancel' : 'Annuler'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {editWarningModalVisible && selectedWarning && (
        <Modal visible={editWarningModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {loadingWarningDetails ? (
                <View style={styles.loadingContainer2}>
                  <ActivityIndicator size="large" color="#001933" />
                  <Text style={styles.loadingText2}>
                    {user.language === 'English' ? 'Loading warning details...' : 'Chargement des détails de l\'avertissement...'}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  contentContainerStyle={styles.modalScrollViewContent}
                  showsVerticalScrollIndicator={false}
                >
                  <Text style={styles.modalTitle}>
                    {user.language === 'English'
                      ? (selectedWarning.type === 'suspension' ? 'Edit Suspension' : 'Edit Warning')
                      : (selectedWarning.type === 'suspension' ? 'Modifier la Suspension' : 'Modifier l\'Avertissement')}
                  </Text>


                  {/* Reason Input */}
                  <TextInput
                    style={styles.input}
                    placeholder={user.language === 'English' ? 'Reason' : 'Raison'}
                    placeholderTextColor="#888"
                    value={selectedWarning.raison}
                    onChangeText={(text) =>
                      setSelectedWarning({ ...selectedWarning, raison: text })
                    }
                  />

                  {/* Description Input */}
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder={user.language === 'English' ? 'Description' : 'Description'}
                    placeholderTextColor="#888"
                    multiline
                    value={selectedWarning.description}
                    onChangeText={(text) =>
                      setSelectedWarning({ ...selectedWarning, description: text })
                    }
                  />

                  {selectedWarning.type === 'suspension' ? (
                    <>
                      {/* Suspension Start Date Input */}
                      <TextInput
                        style={styles.input}
                        placeholder={user.language === 'English' ? 'Suspension Start Date (e.g., 2024-11-25)' : 'Date de début de suspension (ex. : 2024-11-25)'}
                        placeholderTextColor="#888"
                        value={selectedWarning.startDate}
                        onChangeText={(text) =>
                          setSelectedWarning({ ...selectedWarning, startDate: text })
                        }
                      />

                      {/* Suspension End Date Input */}
                      <TextInput
                        style={styles.input}
                        placeholder={user.language === 'English' ? 'Suspension End Date (e.g., 2024-11-30)' : 'Date de fin de suspension (ex. : 2024-11-30)'}
                        placeholderTextColor="#888"
                        value={selectedWarning.endDate}
                        onChangeText={(text) =>
                          setSelectedWarning({ ...selectedWarning, endDate: text })
                        }
                      />
                    </>
                  ) : (
                    // Severity Picker (only for non-suspension types)
                    <Picker
                      selectedValue={selectedWarning.severity}
                      style={styles.input}
                      onValueChange={(itemValue) =>
                        setSelectedWarning({ ...selectedWarning, severity: itemValue })
                      }
                    >
                      <Picker.Item label="Low" value="low" />
                      <Picker.Item label="Medium" value="medium" />
                      <Picker.Item label="High" value="high" />
                    </Picker>
                  )}

                  {/* Display the Image */}
                  {selectedWarning.photo && !removePhoto ? (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: selectedWarning.photo }}
                        style={styles.inlineImage}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setRemovePhoto(true)}
                      >
                        <Text style={styles.removeImageText}>
                          {user.language === 'English' ? 'Remove Image' : 'Supprimer l\'image'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={pickImage} style={styles.pickImageButton}>
                      <Icon name="camera" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}

                  {/* Save Changes Button */}
                  <Pressable
                    style={styles.buttonAdd}
                    onPress={() => {
                      if (selectedWarning) {
                        handleUpdateWarning(selectedWarning);
                        setEditWarningModalVisible(false);
                        setRemovePhoto(false);
                      }
                    }}
                  >
                    <Text style={styles.buttonText}>
                      {user.language === 'English' ? 'Save Changes' : 'Enregistrer les modifications'}
                    </Text>
                  </Pressable>

                  {/* Cancel Button */}
                  <Pressable
                    style={styles.buttonClose}
                    onPress={() => setEditWarningModalVisible(false)}
                  >
                    <Text style={styles.buttonTextClose}>
                      {user.language === 'English' ? 'Cancel' : 'Annuler'}
                    </Text>
                  </Pressable>

                  {/* Delete Warning Button */}
                  <Pressable
                    style={styles.buttonDelete}
                    onPress={() => {
                      if (selectedWarning) {
                        handleDeleteWarning(selectedWarning._id);
                        setEditWarningModalVisible(false);
                      }
                    }}
                  >
                    <Text style={styles.buttonTextClose}>
                      {user.language === 'English'
                        ? (selectedWarning.type === 'suspension' ? 'Delete Suspension' : 'Delete Warning')
                        : (selectedWarning.type === 'suspension' ? 'Supprimer la Suspension' : 'Supprimer l\'Avertissement')}
                    </Text>

                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>
      )}


    </View>
  );
};

export default Warnings;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dim background
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%', // Limit modal height to 80% of screen
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    elevation: 10,
  },
  modalScrollViewContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  loadingContainer2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText2: {
    marginTop: 10,
    fontSize: 16,
    color: '#001933',
  },

  inlineImage: {
    width: '100%', // Fit within the container width
    height: 200,   // Adjust as needed
    borderRadius: 10, // Optional styling for rounded corners
    marginVertical: 10, // Add spacing
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#001933',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#ffff',
  },

  imageContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  removeImageButton: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#001933',
    borderRadius: 8,
  },
  removeImageText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  deleteImageButton: {
    backgroundColor: '#001933',
    padding: 10,
    borderRadius: 5,
    alignSelf: 'center',
    marginTop: 10,
  },
  deleteImageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#95a5a6', // Couleur grisée pour indiquer que le bouton est désactivé
  },
  pickImageButton: {
    width: 50,
    height: 50,
    backgroundColor: '#555',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    alignSelf: 'center', // Centrer horizontalement
  },
  pickImageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: "center",
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#001933',
    textAlign: 'center',
  },
  searchBar: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    height: 50,
    borderWidth: 1,
    borderColor: '#001933',
    color: '#2c3e50',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  employeeItem: {
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderColor: '#ebedef',
    borderWidth: 1,
  },
  employeeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#001933',
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#001933',
  },
  textArea: {
    height: 190,
    textAlignVertical: 'top',
  },
  input: {
    height: 50,
    borderColor: '#001933',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    color: '#2c3e50',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
  },
  buttonAdd: {
    backgroundColor: '#001933',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonClose: {
    backgroundColor: '#7f8c8d',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonTextClose: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 85,
    right: 20,
    backgroundColor: '#001933',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  badgeRead: {
    backgroundColor: '#2ecc71',
  },
  badgeNotRead: {
    backgroundColor: '#e74c3c',
  },
  badgeSigned: {
    backgroundColor: '#3498db',
  },
  badgeNotSigned: {
    backgroundColor: '#e74c3c',
  },
  buttonDelete: {
    backgroundColor: '#e74c3c', // Modernized red color
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  warningBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff', // White text color
  },

  warningItem: {
    flex: 1,
    margin: 10,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '45%', // Two items per row
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderColor: '#001933',
    borderWidth: 1,
  },
  warningHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001933',
    textAlign: 'center',
  },
  warningDate: {
    marginTop: 4,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  warningDescription: {
    fontSize: 14,
    color: '#001933',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',

  },
  warningStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  warningBadge: {
    padding: 6,
    borderRadius: 16,
    marginHorizontal: 5,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },


});

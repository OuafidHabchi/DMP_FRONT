import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Modal, Pressable, Alert, Platform, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native'; // Pour afficher l'aperçu de l'image
import * as FileSystem from 'expo-file-system';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import des icônes
import * as ImageManipulator from 'expo-image-manipulator';
import AppURL from '@/components/src/URL';
import PickerModal from '@/components/src/PickerModal';
import TemplateManager from '@/components/src/TemplateManager';

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
  susNombre?: String;
  link: string;
  template: boolean;
};
type Template = {
  _id: string;
  type: string;
  raison: string;
  description: string;
  severity: string;
  link: string;
};

type Disponibility = {
  _id: string; // Identifiant unique pour chaque disponibilité
  employeeId: string; // L'employé associé
  selectedDay: string; // Le jour sélectionné pour la disponibilité
  status?: 'accepted' | 'rejected'; // Optionnel, statut de la disponibilité
  decisions?: 'pending' | 'accepted' | 'rejected'; // Statut de la décision
};


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
  const [newImage, setNewImage] = useState<string | null>(null);
  const [isTemplateVisible, setTemplateVisible] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [disponibilitesOptions, setDisponibilitesOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedShiftDates, setSelectedShiftDates] = useState<{ id: string; label: string }[]>([]);
  const [newWarning, setNewWarning] = useState({
    employeID: '',
    type: '',
    raison: '',
    description: '',
    severity: '',
    date: '',
    susNombre: '',
    read: false,
    signature: false,
    photo: '', // Ne
    link: '', // Ajouter ce champ

  });

  const fetchDisponibilites = async (employeeId: string, selectedDate: string) => {
    try {
      const response = await axios.get(
        `${AppURL}/api/disponibilites/disponibilites/employee/${employeeId}/after/${selectedDate}?dsp_code=${user.dsp_code}`
      );
      const disponibilites = response.data;

      const options = disponibilites.map((dispo: any) => ({
        label: `${dispo.selectedDay} (${dispo.decisions || 'N/A'})`,
        value: dispo._id,
      }));

      setDisponibilitesOptions(options);
    } catch (error) {
      console.error('Error fetching disponibilites:', error);
    }
  };


  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/warnings/wornings/templates/get?dsp_code=${user.dsp_code}`);
      setTemplates(response.data); // Mettez à jour l'état avec uniquement les templates
    } catch (error) {
      console.error("Error fetching templates:", error);
      Alert.alert(user.language === 'English' ? 'Error' : 'Erreur', user.language === 'English' ? 'Failed to fetch templates.' : 'Impossible de récupérer les modèles.');
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      if (newWarningModalVisible) {
        // Appeler fetchTemplates
        fetchTemplates();

        // Vérifier si selectedEmployee est défini avant d'appeler fetchDisponibilites
        if (selectedEmployee && selectedEmployee._id) {
          const currentDate = new Date().toISOString();
          await fetchDisponibilites(selectedEmployee._id, currentDate);
        } else {
          console.warn(
            'Selected employee or employee ID is undefined. Skipping fetchDisponibilites.'
          );
        }
      }
    };

    fetchData(); // Appel de la fonction interne
  }, [newWarningModalVisible, selectedEmployee]);





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

      // Récupérer les employés et tous les avertissements en parallèle
      const [employeesResponse, warningsResponse] = await Promise.all([
        axios.get(`${AppURL}/api/employee?dsp_code=${user.dsp_code}`),
        axios.get(`${AppURL}/api/warnings/wornings?dsp_code=${user.dsp_code}`),
      ]);

      const employees = employeesResponse.data; // Liste des employés
      const warnings = warningsResponse.data;  // Liste de tous les avertissements

      // Créer un mapping des avertissements par employé
      const warningsByEmployee: Record<string, Warning[]> = {};
      warnings.forEach((warning: Warning) => {
        if (!warningsByEmployee[warning.employeID]) {
          warningsByEmployee[warning.employeID] = [];
        }
        warningsByEmployee[warning.employeID].push(warning);
      });

      // Ajouter le nombre d'avertissements à chaque employé
      const employeeWarningsCount: Record<string, number> = {};
      employees.forEach((employee: User) => {
        employeeWarningsCount[employee._id] = warningsByEmployee[employee._id]?.length || 0;
      });

      // Mettre à jour les états
      setEmployees(employees);
      setFilteredEmployees(employees);
      setEmployeeWarningsCount(employeeWarningsCount);

      setLoading(false); // Fin du chargement
    } catch (error) {
      console.error('Error fetching employees and warnings:', error);
      setLoading(false); // Fin du chargement même en cas d'erreur
    }
  };



  const fetchWarningsByEmployeeID = async (id: string) => {
    try {
      const response = await axios.get(`${AppURL}/api/warnings/wornings/employe/${id}?dsp_code=${user.dsp_code}`);
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
      quality: 1, // Full quality (we will compress it below)
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;

      try {
        // Redimensionner et compresser l'image
        const manipulatedImage = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: 500 } }], // Redimensionne l'image à une largeur maximale de 800px (conserve le ratio)
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG } // Compresser l'image à 70% de qualité
        );

        // Stocke l'image manipulée
        setNewImage(manipulatedImage.uri); // Mettre à jour immédiatement l'aperçu
        setNewWarning((prev) => ({ ...prev, photo: manipulatedImage.uri }));
        setSelectedImage(manipulatedImage.uri); // Optionnel si vous utilisez selectedImage ailleurs
      } catch (error) {
        console.error("Error resizing or compressing the image:", error);
        alert("Failed to process the image.");
      }
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
      susNombre: '',
      read: false,
      signature: false,
      photo: '',
      link: '',
    });
    setSelectedShiftDates([]); // Clear selected dates
    setSelectedImage(null); // Reset image
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
    const formData = new FormData();
    formData.append("employeID", selectedEmployee?._id || "");
    formData.append("type", newWarning.type);
    formData.append("raison", newWarning.raison);
    formData.append("description", newWarning.description);
    formData.append("severity", newWarning.type === "suspension" ? "" : newWarning.severity || "");
    formData.append("expoPushToken", selectedEmployee?.expoPushToken || "");
    formData.append("date", today);
    formData.append("signature", newWarning.signature ? "true" : "false");
    formData.append('link', newWarning.link || '');
    formData.append('susNombre', selectedShiftDates.length.toString());

    // Ajout de la photo
    if (newWarning.photo) {
      try {
        const response = await fetch(newWarning.photo);
        const fileBlob = await response.blob();

        // Extraire le nom de fichier d'origine, y compris l'extension
        let fileName = newWarning.photo.split("/").pop() || `file-${Date.now()}`;

        // Ajouter une extension si manquante
        if (!fileName.includes(".")) {
          const fileExtension = fileBlob.type.split("/")[1] || "jpeg"; // Utilise le type MIME pour obtenir l'extension
          fileName = `${fileName}.${fileExtension}`;
        }

        formData.append("photo", new File([fileBlob], fileName, { type: fileBlob.type }));
      } catch (error) {
        console.error("Error processing the image:", error);
        showAlert("Failed to process the image", "error");
        return;
      }
    }

    // Envoi au backend
    try {
      // Use selectedShiftDates directly if it contains IDs
      const disponibiliteIds = selectedShiftDates.map((item) => item.id); // Extract IDs

      if (newWarning.type === "suspension") {
        // Prepare data for updating disponibilites
        const disponibiliteUpdateData = {
          disponibiliteIds, // Use IDs directly
          suspension: true,
        };

        // Execute both requests in parallel
        const [createWarningResponse, updateDisponibilitesResponse] = await Promise.all([
          axios.post(`${AppURL}/api/warnings/wornings?dsp_code=${user.dsp_code}`, formData, {
            headers: {}, // No specific headers for FormData
          }),
          axios.post(
            `${AppURL}/api/disponibilites/disponibilites/suspension?dsp_code=${user.dsp_code}`,
            disponibiliteUpdateData,
            {
              headers: { "Content-Type": "application/json" },
            }
          ),
        ]);

        // Check if both requests succeeded
        if (createWarningResponse.status === 201 && updateDisponibilitesResponse.status === 200) {
          showAlert("The suspension and associated updates were sent successfully!", "success");
        } else {
          showAlert("Failed to submit the suspension or update disponibilites", "error");
        }
      } else {
        // Create a warning only if type is not "suspension"
        const createWarningResponse = await axios.post(
          `${AppURL}/api/warnings/wornings?dsp_code=${user.dsp_code}`,
          formData,
          {
            headers: {}, // No specific headers for FormData
          }
        );

        if (createWarningResponse.status === 201) {
          showAlert("The warning has been sent successfully!", "success");
        } else {
          showAlert("Failed to submit the warning", "error");
        }
      }

      // Reset state and update data on success
      setNewWarningModalVisible(false);
      await fetchEmployees(); // Update employee data
      resetForm(); // Reset the form
    } catch (error) {
      console.error("Error submitting warning or updating disponibilites:", error);
      showAlert("An unexpected error occurred. Please try again later.", "error");
    }


  };






  const submitWarningMobile = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Validation des champs
    if (!newWarning.raison || !newWarning.description || !newWarning.type) {
      showAlert(user.language === 'English' ? "All fields are required" : "Tous les champs sont requis", "error");
      return;
    }

    // Préparation du FormData
    const formData = new FormData();
    formData.append("employeID", selectedEmployee?._id || "");
    formData.append("type", newWarning.type);
    formData.append("raison", newWarning.raison);
    formData.append("description", newWarning.description);
    formData.append("severity", newWarning.type === "suspension" ? "" : newWarning.severity || "");
    formData.append("expoPushToken", selectedEmployee?.expoPushToken || "");
    formData.append("date", today);
    formData.append("read", newWarning.read ? "true" : "false");
    formData.append("signature", newWarning.signature ? "true" : "false");
    formData.append('link', newWarning.link || '');
    formData.append('susNombre', selectedShiftDates.length.toString());



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
      // Extract IDs from selectedShiftDates
      const disponibiliteIds = selectedShiftDates.map((item) => item.id); // Extract IDs

      if (newWarning.type === "suspension") {
        // Prepare data for updating disponibilites
        const disponibiliteUpdateData = {
          disponibiliteIds, // Use IDs directly
          suspension: true,
        };

        // Execute both requests sequentially (safer for mobile)
        const createWarningResponse = await axios.post(
          `${AppURL}/api/warnings/wornings?dsp_code=${user.dsp_code}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data", // Ensure correct content type
            },
          }
        );

        if (createWarningResponse.status === 201) {
          // Update disponibilites only if warning creation is successful
          const updateDisponibilitesResponse = await axios.post(
            `${AppURL}/api/disponibilites/disponibilites/suspension?dsp_code=${user.dsp_code}`,
            disponibiliteUpdateData,
            {
              headers: {
                "Content-Type": "application/json", // JSON for this request
              },
            }
          );

          if (updateDisponibilitesResponse.status === 200) {
            showAlert(
              "The suspension and associated updates were sent successfully!",
              "success"
            );
          } else {
            showAlert("Failed to update disponibilites", "error");
          }
        } else {
          showAlert("Failed to submit the suspension", "error");
        }
      } else {
        // Create a warning only if type is not "suspension"
        const createWarningResponse = await axios.post(
          `${AppURL}/api/warnings/wornings?dsp_code=${user.dsp_code}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data", // Ensure correct content type
            },
          }
        );

        if (createWarningResponse.status === 201) {
          showAlert("The warning has been sent successfully!", "success");
        } else {
          showAlert("Failed to submit the warning", "error");
        }
      }

      // Reset state and update data on success
      setNewWarningModalVisible(false);
      await fetchEmployees(); // Update employee data
      resetForm(); // Reset the form
    } catch (error) {
      // Log the error for debugging
      console.error("Error submitting warning or updating disponibilites:", error);
      showAlert("An unexpected error occurred. Please try again later.", "error");
    }


  };




  const handleDeleteWarning = async (warningId: string) => {
    try {
      await axios.delete(`${AppURL}/api/warnings/wornings/${warningId}?dsp_code=${user.dsp_code}`);
      setWarnings(warnings.filter((w) => w._id !== warningId));
      showAlert('Warning deleted successfully!', 'success');
      await fetchEmployees(); // Update employee warning counts dynamically
    } catch (error) {
      console.error('Error deleting warning:', error);
      showAlert('Failed to delete warning. Please try again later.', 'error');
    }
  };

  const handleUpdateWarning = async (updatedWarning: Warning) => {
    // Validation des champs
    if (!updatedWarning.raison || !updatedWarning.description || !updatedWarning.type) {
      showAlert(
        user.language === "English" ? "All fields are required" : "Tous les champs sont requis",
        "error"
      );
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("raison", updatedWarning.raison.trim());
      formData.append("description", updatedWarning.description.trim());
      formData.append("type", updatedWarning.type);
      formData.append("severity", updatedWarning.severity || "");
      formData.append("link", updatedWarning.link || "");
  
      // Vérifiez si l'image doit être retirée
      if (removePhoto) {
        formData.append("removePhoto", "true");
      } else if (selectedImage) {
        if (Platform.OS === "web") {
          try {
            const response = await fetch(selectedImage);
            if (!response.ok) throw new Error("Failed to fetch selected image.");
            const fileBlob = await response.blob();
  
            let fileName = selectedImage.split("/").pop() || `file-${Date.now()}`;
            if (!fileName.includes(".")) {
              const fileExtension = fileBlob.type.split("/")[1] || "jpeg";
              fileName = `${fileName}.${fileExtension}`;
            }
  
            formData.append("photo", new File([fileBlob], fileName, { type: fileBlob.type }));
          } catch (error) {
            console.error("Error processing the image (web):", error);
            showAlert("Failed to process the selected image. Please try again.", "error");
            return;
          }
        } else {
          try {
            const filename = selectedImage.split("/").pop() || `file-${Date.now()}`;
            const fileType = filename.split(".").pop()?.toLowerCase() || "jpg";
            const mimeType =
              fileType === "jpg" || fileType === "jpeg" || fileType === "png"
                ? `image/${fileType === "jpg" ? "jpeg" : fileType}`
                : "application/octet-stream";
  
            const fileInfo = await FileSystem.getInfoAsync(selectedImage);
            if (fileInfo.exists) {
              formData.append("photo", {
                uri: fileInfo.uri,
                name: filename,
                type: mimeType,
              } as unknown as Blob); // Cast explicite pour TypeScript
            } else {
              showAlert("File not found. Please try again.", "error");
              return;
            }
          } catch (error) {
            console.error("Error processing the image (mobile):", error);
            showAlert("Failed to process the selected image. Please try again.", "error");
            return;
          }
        }
      } else {
        if (updatedWarning.photo) {
          formData.append("photo", updatedWarning.photo);
        }
      }
  
      // Appel au backend
      const response = await axios.put(
        `${AppURL}/api/warnings/wornings/${updatedWarning._id}?dsp_code=${user.dsp_code}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
  
      if (response.status === 200) {
        showAlert("Warning updated successfully!", "success");
        setWarnings((prevWarnings) =>
          prevWarnings.map((w) => (w._id === updatedWarning._id ? response.data : w))
        );
        setRemovePhoto(false);
        setSelectedImage(null);
      } else {
        console.error("Unexpected response:", response);
        showAlert("Failed to update the warning. Please try again later.", "error");
      }
    } catch (error) {
      console.error("Error updating warning:", error);
      showAlert("An unexpected error occurred. Please try again later.", "error");
    }
  };
  
  







  const fetchWarningDetails = async (warningId: string) => {
    try {
      const response = await axios.get(`${AppURL}/api/warnings/wornings/${warningId}?dsp_code=${user.dsp_code}`);
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
          <ActivityIndicator size="large" color="#001933" />
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
          <View style={styles.containerTem}>
            {/* Bouton circulaire pour ouvrir le TemplateManager */}
            <TouchableOpacity
              style={styles.templateButton}
              onPress={() => setTemplateVisible(true)}
            >
              <FontAwesome name="file-text-o" size={24} color="#fff" />
            </TouchableOpacity>

            {/* Composant TemplateManager */}
            <TemplateManager
              isVisible={isTemplateVisible}
              onClose={() => setTemplateVisible(false)}
              dsp_code={user.dsp_code}
              language={user.language}
            />
          </View>

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
                  onPress={async () => {
                    try {
                      // Fermer le modal principal
                      setModalVisible(false);

                      // Démarrer un indicateur de chargement (optionnel)
                      setLoadingWarningDetails(true);

                      // Charger les détails du warning sélectionné
                      await fetchWarningDetails(item._id);

                      // Arrêter l'indicateur de chargement
                      setLoadingWarningDetails(false);

                      // Ouvrir le modal d'édition
                      setEditWarningModalVisible(true);
                    } catch (error) {
                      console.error("Error opening edit warning modal:", error);
                      // Afficher une alerte en cas d'échec
                      Alert.alert(
                        user.language === 'English' ? "Error" : "Erreur",
                        user.language === 'English'
                          ? "Failed to load warning details."
                          : "Échec du chargement des détails de l'avertissement."
                      );
                    }
                  }}

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
              onPress={() => {
                setModalVisible(false); // Fermer le modal principal
                setNewWarningModalVisible(true); // Ouvrir le nouveau modal
              }}
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
                {/* Template Picker */}
                <PickerModal
                  title={user.language === 'English' ? 'Select Template' : 'Sélectionner un Modèle'}
                  options={[
                    { label: user.language === 'English' ? 'No Template' : 'Aucun Modèle', value: '' },
                    ...templates.map((template) => ({
                      label: `${template.raison} (${template.type})`,
                      value: template._id,
                    })),
                  ]}
                  selectedValue={selectedTemplate?._id || ''}
                  onValueChange={(templateId) => {
                    if (templateId === '') {
                      // Si "Aucun Modèle" est sélectionné, vider les champs
                      setSelectedTemplate(null);
                      setNewWarning({
                        employeID: '',
                        type: '',
                        raison: '',
                        description: '',
                        severity: '',
                        date: '',
                        susNombre: '',
                        read: false,
                        signature: false,
                        photo: '',
                        link: '',
                      });
                    } else {
                      // Si un modèle est sélectionné, remplir les champs
                      const selected = templates.find((template) => template._id === templateId);
                      if (selected) {
                        setSelectedTemplate(selected);
                        setNewWarning((prev) => ({
                          ...prev,
                          type: selected.type,
                          raison: selected.raison,
                          description: selected.description,
                          severity: selected.severity || '',
                          link: selected.link || '',
                        }));
                      }
                    }
                  }}
                />

                {/* Type Picker */}
                <PickerModal
                  title={user.language === 'English' ? 'Select Type' : 'Sélectionner le Type'}
                  options={[
                    { label: 'Warning', value: 'warning' },
                    { label: 'Suspension', value: 'suspension' },
                  ]}
                  selectedValue={newWarning.type}
                  onValueChange={(value) => setNewWarning({ ...newWarning, type: value })}
                />

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
                <TextInput
                  style={styles.input}
                  placeholder={user.language === 'English' ? 'Link (optional)' : 'Lien (optionnel)'}
                  placeholderTextColor="#888"
                  value={newWarning.link}
                  onChangeText={(text) => setNewWarning((prev) => ({ ...prev, link: text }))}
                />


                {/* Conditional Inputs */}
                {newWarning.type === 'suspension' ? (
                  <>
                    <PickerModal
                      title={user.language === 'English' ? 'Select Availability' : 'Sélectionner une Disponibilité'}
                      options={disponibilitesOptions}
                      selectedValue={newWarning.employeID || ''} // Default value
                      onValueChange={(value) => {
                        const selectedOption = disponibilitesOptions.find((opt) => opt.value === value);
                        // Add the selected option to the list if it's valid
                        if (
                          selectedOption &&
                          !selectedShiftDates.some((item) => item.id === selectedOption.value)
                        ) {
                          setSelectedShiftDates((prevDates) => [
                            ...prevDates,
                            { id: selectedOption.value, label: selectedOption.label }, // Store as an object
                          ]);
                        }
                      }}
                    />

                    <View>
                      <Text style={styles.label}>
                        {user.language === 'English'
                          ? 'Selected Shift Dates:'
                          : 'Dates des shifts sélectionnés :'}
                      </Text>

                      {selectedShiftDates.length > 0 ? (
                        <View style={styles.datesContainer}>
                          {selectedShiftDates.map((item, index) => (
                            <View key={index} style={styles.dateItem}>
                              {/* Ensure item.label exists */}
                              <Text style={styles.dateText}>{item?.label || 'Invalid Date'}</Text>
                              <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => {
                                  setSelectedShiftDates((prevDates) =>
                                    prevDates.filter((_, i) => i !== index)
                                  );
                                }}
                              >
                                <FontAwesome name="times-circle" size={20} color="#e74c3c" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.noDatesText}>
                          {user.language === 'English'
                            ? 'No shifts selected yet.'
                            : 'Aucun shift sélectionné pour le moment.'}
                        </Text>
                      )}
                    </View>
                  </>

                ) : (

                  <PickerModal
                    title={user.language === 'English' ? 'Select Severity' : 'Sélectionner la Gravité'}
                    options={[
                      { label: 'Low', value: 'low' },
                      { label: 'Medium', value: 'medium' },
                      { label: 'High', value: 'high' },
                    ]}
                    selectedValue={newWarning.severity}
                    onValueChange={(value) => setNewWarning({ ...newWarning, severity: value })}
                  />
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
                  <TextInput
                    style={styles.input}
                    placeholder={user.language === 'English' ? 'Link (optional)' : 'Lien (optionnel)'}
                    placeholderTextColor="#888"
                    value={selectedWarning?.link || ''}
                    onChangeText={(text) =>
                      setSelectedWarning((prev) => (prev ? { ...prev, link: text } : prev))
                    }
                  />


                  {selectedWarning.type === 'suspension' ? (
                    <>

                      <Text style={styles.modalText}>
                        {user.language === 'English'
                          ? 'Number of Suspended Shifts: '
                          : 'Nombre de shifts suspendus: '}
                        {selectedWarning.susNombre}
                      </Text>

                    </>
                  ) : (
                    // Severity Picker (only for non-suspension types)
                    <PickerModal
                      title="Select Severity" // Titre du modal ou affichage par défaut
                      options={[
                        { label: 'Low', value: 'low' },
                        { label: 'Medium', value: 'medium' },
                        { label: 'High', value: 'high' },
                      ]}
                      selectedValue={selectedWarning.severity}
                      onValueChange={(value) => setSelectedWarning({ ...selectedWarning, severity: value })}
                    />
                  )}
                  {/* Display the Image */}
                  {newImage ? (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: newImage }}
                        style={styles.inlineImage}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => setNewImage(null)}
                      >
                        <Text style={styles.removeImageText}>
                          {user.language === 'English' ? 'Remove Image' : 'Supprimer l\'image'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : selectedWarning.photo && !removePhoto ? (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: `${selectedWarning.photo}` }}
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
  modalText: {
    padding: 10,
    fontSize: 14,
    color: '#ff4d4d',
    marginTop: 5,
    fontWeight: 'bold',
  },
  datesContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  dateText: {
    fontSize: 14,
    color: '#001933',
  },
  removeButton: {
    marginLeft: 10,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDatesText: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#001933',
  },
  containerTem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  contentText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  templateButton: {
    position: 'absolute',
    bottom: 20, // Position en bas de l'écran
    right: 20, // Aligné à droite
    width: 60, // Largeur du bouton
    height: 60, // Hauteur du bouton
    borderRadius: 30, // Cercle parfait
    backgroundColor: '#001933', // Couleur du bouton
    justifyContent: 'center', // Centre l'icône
    alignItems: 'center', // Centre l'icône
    shadowColor: '#000', // Ombre pour un effet visuel
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5, // Ombre sur Android
  },

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
    backgroundColor: '#ffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#001933',
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

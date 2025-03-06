import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Platform, Modal, GestureResponderEvent } from 'react-native';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';
import PickerModal from '@/components/src/PickerModal';
const WeeklyScoreCard = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [keyFocusAreas, setKeyFocusAreas] = useState<string[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<Record<string, string>>({});
  const [isSendingWarnings, setIsSendingWarnings] = useState(false);


  const getTitle = (fr: string, en: string) => (user?.language === "Français" ? fr : en);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {getTitle("Cette option est uniquement disponible sur la version web.", "This option is only available on the web version.")}
        </Text>
      </View>
    );
  }

  // Handle file selection and upload (Web only)
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Upload the file to the server automatically
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(`${AppURL}/api/ScroceCrd/upload?dsp_code=${user?.dsp_code}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setResult(response.data); // Display the result after upload

        extractKeyFocusAreas(response.data);

        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'File uploaded successfully'
            : 'Fichier téléchargé avec succès'
        );

        window.alert(
          user?.language === 'English'
            ? 'File uploaded successfully'
            : 'Fichier téléchargé avec succès'
        );
      } catch (error) {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Error uploading file'
            : 'Erreur lors du téléchargement du fichier'
        );

        window.alert(
          user?.language === 'English'
            ? 'Error uploading file'
            : 'Erreur lors du téléchargement du fichier'
        );
      } finally {
        setIsUploading(false);
      }
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/warnings/wornings/templates/get?dsp_code=${user?.dsp_code}`);

      // ✅ Filtrer uniquement les templates ayant type: "warning"
      const warningTemplates = response.data.filter((template: any) => template.type === "warning");

      setTemplates(warningTemplates);
    } catch (error) {
    }
  };


  const extractKeyFocusAreas = (data: any[]) => {
    const uniqueFocusAreas = Array.from(
      new Set(data.map((item) => item["Key Focus Area"]).filter((focus) => focus && focus !== "N/A"))
    );
    setKeyFocusAreas(uniqueFocusAreas);
  };


  const processProfilesAndSendWarnings = async () => {
    if (!result || !Array.isArray(result)) {
      showAlert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'No file uploaded'
          : 'Aucun fichier téléchargé'
      );
      return;
    }

    // ✅ Extraire les Key Focus Areas et ouvrir le modal
    extractKeyFocusAreas(result);
    setIsModalVisible(true);

    // ✅ Charger les templates
    await fetchTemplates();
  };


  const sendWarnings = async () => {
    if (Object.keys(selectedTemplates).length !== keyFocusAreas.length) {
      showAlert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Please select a template for each Focus Area'
          : 'Veuillez sélectionner un modèle pour chaque Focus Area'
      );
      return;
    }

    setIsSendingWarnings(true);

    try {
      // ✅ Mettre à jour les profils en premier
      const scorecardUpdates = result.map((item: any) => ({
        Transporter_ID: item["Transporter ID"] || "Missing ID",
        scoreCard: item["Overall Standing"] || "N/A",
        focusArea: item["Key Focus Area"] || "N/A",
      }));

      if (scorecardUpdates.some((item: any) => item.Transporter_ID === "Missing ID")) {
        showAlert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Some entries have missing transporter IDs'
            : 'Certaines entrées ont des identifiants de transporteur manquants'
        );
        setIsSendingWarnings(false);
        return;
      }

      const updateResponse = await axios.put(`${AppURL}/api/employee/scoreCard?dsp_code=${user?.dsp_code}`, scorecardUpdates);
      if (updateResponse.status !== 200) {
        showAlert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Error updating profiles'
            : 'Erreur lors de la mise à jour des profils'
        );
        setIsSendingWarnings(false);
        return;
      }

      // ✅ Récupérer les employés après mise à jour
      const employeesResponse = await axios.get(`${AppURL}/api/employee?dsp_code=${user?.dsp_code}`);
      const employees = employeesResponse.data;
      const employeesByTransporterId = employees.reduce((acc: any, employee: any) => {
        acc[employee.Transporter_ID] = employee;
        return acc;
      }, {});

      // ✅ Créer les warnings selon les templates sélectionnés
      const warningsToCreate = result
        .filter((item: any) => item["Overall Standing"] !== "Fantastic")
        .map((item: any) => {
          const employee = employeesByTransporterId[item["Transporter ID"]];
          if (!employee) return null;

          const selectedTemplateId = selectedTemplates[item["Key Focus Area"]];
          const template = templates.find((t) => t._id === selectedTemplateId);

          if (!template) return null;

          return {
            employeID: employee._id,
            type: "warning",
            raison: template.raison,
            focus: item["Key Focus Area"],
            description: template.description,
            date: new Date().toISOString(),
            severity: template.severity,
            read: false,
            signature: false,
            expoPushToken: employee.expoPushToken,
          };
        })
        .filter(Boolean);

      if (warningsToCreate.length === 0) {
        showAlert(
          user?.language === 'English' ? 'Info' : 'Info',
          user?.language === 'English'
            ? 'No warnings to send'
            : 'Aucun avertissement à envoyer'
        );
        setIsSendingWarnings(false);
        setIsModalVisible(false);
        return;
      }

      // ✅ Envoi des warnings
      const warningResponse = await axios.post(`${AppURL}/api/warnings/wornings/bulk?dsp_code=${user?.dsp_code}`, warningsToCreate);
      if (warningResponse.status === 200) {
        showAlert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Warnings sent successfully'
            : 'Avertissements envoyés avec succès'
        );
      } else {
        showAlert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to create warnings'
            : 'Échec de la création des avertissements'
        );
      }

    } catch (error) {
      showAlert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'An error occurred while sending warnings'
          : 'Une erreur est survenue lors de l\'envoi des avertissements'
      );
    }
    finally {
      setIsSendingWarnings(false);
      setIsModalVisible(false);
    }
  };




  // Helper function to show alerts on both platforms
  const showAlert = (title: string, message: string) => {
    if (typeof window !== 'undefined') {
      // Web environment
      alert(`${title}: ${message}`);
    } else {
      // Mobile environment
      Alert.alert(title, message);
    }
  };





  const renderCard = ({ item, index }: { item: any, index: number }) => {
    const excludedAttributes = ["Delivery associate ", "Overall Standing", "Key Focus Area"];

    return (
      <View style={styles.card} key={index}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item["Delivery associate "]}</Text>
          <Text style={styles.cardText}>Overall Standing: {item["Overall Standing"]}</Text>
          <Text style={styles.cardText}>Key Focus Area: {item["Key Focus Area"] || "N/A"}</Text>
          <TouchableOpacity
            onPress={() => setExpandedCard(expandedCard === index ? null : index)}
            style={styles.expandButton}
          >
            <Text style={styles.expandButtonText}>
              {user?.language === 'English'
                ? (expandedCard === index ? 'Hide' : 'Details')
                : (expandedCard === index ? 'Cacher' : 'Détails')}
            </Text>

          </TouchableOpacity>
        </View>

        {expandedCard === index && (
          <View style={styles.cardDetails}>
            {Object.keys(item).map((key) => {
              if (!excludedAttributes.includes(key)) {
                return (
                  <Text key={key} style={styles.detailText}>
                    {key}: {item[key] || "N/A"}
                  </Text>
                );
              }
              return null;
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {user?.language === 'English' ? 'Weekly Score Card' : 'Carte de Score Hebdomadaire'}
      </Text>

      {result && result[0] && (
        <Text style={styles.weekText}>
          {user?.language === 'English' ? `Week: ${result[0]["﻿\"Week\""]}` : `Semaine: ${result[0]["﻿\"Week\""]}`}
        </Text>
      )}

      {/* File input (Web only) */}
      <input
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        style={{ marginTop: 20 }}
      />

      {/* Single Button aligned horizontally */}
      <TouchableOpacity
        onPress={processProfilesAndSendWarnings}
        style={styles.button}
        disabled={isProcessing} // Désactiver le bouton pendant le traitement
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color="#001933" />
        ) : (
          <Text style={styles.buttonText}>
            {user?.language === 'English' ? 'Process Profiles & Send Warnings' : 'Traiter les profils et envoyer des avertissements'}
          </Text>
        )}
      </TouchableOpacity>



      {result && Array.isArray(result) && (
        <ScrollView style={{ marginTop: 20, width: '100%' }}>
          {result.map((item: any, index: number) => renderCard({ item, index }))}
        </ScrollView>
      )}



      {isModalVisible && (
        <Modal visible={isModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>

              {/* ✅ En-tête avec titre et bouton de fermeture */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {user?.language === 'English' ? 'Select Templates' : 'Sélectionnez un Modèle'}
                </Text>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.modalCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* ✅ Contenu Scrollable */}
              <ScrollView contentContainerStyle={styles.modalContent}>
                {keyFocusAreas.map((focusArea) => (
                  <View key={focusArea} style={styles.focusAreaContainer}>
                    <Text style={styles.focusAreaTitle}>{focusArea}</Text>
                    <PickerModal
                      title={user?.language === 'English' ? 'Select Template' : 'Sélectionner un Modèle'}
                      options={templates.map((template) => ({
                        label: `${template.raison} (${template.type})`,
                        value: template._id,
                      }))}
                      selectedValue={selectedTemplates[focusArea] || ''}
                      onValueChange={(value) => setSelectedTemplates({ ...selectedTemplates, [focusArea]: value })}
                    />
                  </View>
                ))}
              </ScrollView>

              {/* ✅ Boutons d’action */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.buttonSend, isSendingWarnings ? styles.buttonDisabled : null]}
                  onPress={sendWarnings}
                  disabled={isSendingWarnings}
                >
                  {isSendingWarnings ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonTextModle}>{user?.language === 'English' ? 'Send Warnings' : 'Envoyer les Avertissements'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}







    </View>
  );
};

export default WeeklyScoreCard;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001933',
  },
  modalCloseButton: {
    backgroundColor: '#ff4d4d',
    borderRadius: 50,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalContent: {
    paddingVertical: 10,
  },
  focusAreaContainer: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  focusAreaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#001933',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  buttonSend: {
    flex: 1,
    backgroundColor: '#001933',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  buttonCancel: {
    flex: 1,
    backgroundColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonTextModle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonCancelText: {
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.5,
  },



  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#001933',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  weekText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'column',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  cardText: {
    fontSize: 14,
    marginVertical: 4,
    color: '#555555',
  },
  cardDetails: {
    marginTop: 10,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 12,
    marginVertical: 2,
    color: '#333333',
  },
  expandButton: {
    marginTop: 10,
  },
  expandButtonText: {
    color: '#001933',
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#ffff',
    padding: 10,
    borderRadius: 5,
    width: '30%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

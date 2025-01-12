import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute } from '@react-navigation/native';
const URL = 'https://coral-app-wqv9l.ondigitalocean.app'; // Ensure the correct URL
const URL_warnings = 'https://coral-app-wqv9l.ondigitalocean.app'; // Ensure the correct URL

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

const WeeklyScoreCard = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);


  // Handle file selection and upload (Web only)
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      Alert.alert('File Selected', file.name);

      // Upload the file to the server automatically
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(`https://coral-app-wqv9l.ondigitalocean.app/api/ScroceCrd/upload?dsp_code=${user.dsp_code}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        setResult(response.data); // Display the result after upload
        Alert.alert('Success', 'File uploaded successfully');
      } catch (error) {
        console.error('Error uploading file:', error);
        Alert.alert('Error', 'Error uploading file');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const processProfilesAndSendWarnings = async () => {
    if (!result || !Array.isArray(result)) {
      showAlert('Error', 'No file uploaded');
      setIsProcessing(false); // Fin du traitement
      return;
    }

    setIsProcessing(true); // Début du traitement

    try {
      const scorecardUpdates = result.map((item: any) => ({
        Transporter_ID: item["Transporter ID"] || "Missing ID",
        scoreCard: item["Overall Standing"] || "N/A",
        focusArea: item["Key Focus Area"] || "N/A",
      }));

      if (scorecardUpdates.some((item) => item.Transporter_ID === "Missing ID")) {
        showAlert('Error', 'Some entries have missing transporter IDs');
        setIsProcessing(false); // Fin du traitement
        return;
      }

      const updateResponse = await axios.put(`${URL}/api/employee/scoreCard?dsp_code=${user.dsp_code}`, scorecardUpdates);
      if (updateResponse.status === 200) {
        showAlert('Success', 'Profiles updated successfully');
      } else {
        showAlert('Error', 'Error updating profiles');
        setIsProcessing(false); // Fin du traitement
        return;
      }

      const employeesResponse = await axios.get(`${URL}/api/employee?dsp_code=${user.dsp_code}`);
      const employees = employeesResponse.data;

      const employeesByTransporterId = employees.reduce((acc: any, employee: any) => {
        acc[employee.Transporter_ID] = employee;
        return acc;
      }, {});

      const warningsToCreate = result
        .filter((item: any) => item["Overall Standing"] !== "Fantastic")
        .map((item: any) => {
          const employee = employeesByTransporterId[item["Transporter ID"]];
          if (!employee) {
            console.warn(`No employee found for Transporter_ID: ${item["Transporter ID"]}`);
            return null;
          }

          return {
            employeID: employee._id,
            type: "warning",
            raison: `Scorecard rating: ${item["Overall Standing"]}`,
            focus: item["Key Focus Area"],
            description: `Immediate attention is required. Please utilize the Virtual Dispatch tool to thoroughly assess and improve your performance in the specified Key Focus Area: ${item["Key Focus Area"] || "N/A"}. This is a critical step to ensure alignment with expected standards. Neglecting this directive may lead to further review of your performance and potential escalation of the issue. Act now to avoid unnecessary consequences. `,
            date: new Date().toISOString(),
            severity: "high",
            read: false,
            signature: false,
            expoPushToken: employee.expoPushToken,
          };
        })
        .filter(Boolean);

      if (warningsToCreate.length === 0) {
        showAlert('Info', 'No warnings to send');
        setIsProcessing(false); // Fin du traitement
        return;
      }

      const warningResponse = await axios.post(`${URL_warnings}/api/warnings/wornings/bulk?dsp_code=${user.dsp_code}`, warningsToCreate);
      if (warningResponse.status === 200) {
        showAlert(
          user.language === 'English' ? 'Success' : 'Succès',
          user.language === 'English' ? 'Profiles updated and warnings created successfully' : 'Profils mis à jour et avertissements créés avec succès'
        );
      } else {
        showAlert(
          user.language === 'English' ? 'Error' : 'Erreur',
          user.language === 'English' ? 'Failed to create warnings' : 'Échec de la création des avertissements'
        );
      }
    } catch (error) {
      console.error('Error processing profiles and warnings:', error);
      showAlert(
        user.language === 'English' ? 'Error' : 'Erreur',
        user.language === 'English' ? 'An error occurred while processing profiles and warnings' : 'Une erreur est survenue lors du traitement des profils et des avertissements'
      );
    } finally {
      setIsProcessing(false); // Fin du traitement dans tous les cas
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
              {user.language === 'English'
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
        {user.language === 'English' ? 'Weekly Score Card' : 'Carte de Score Hebdomadaire'}
      </Text>

      {result && result[0] && (
        <Text style={styles.weekText}>
          {user.language === 'English' ? `Week: ${result[0]["﻿\"Week\""]}` : `Semaine: ${result[0]["﻿\"Week\""]}`}
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
            {user.language === 'English' ? 'Process Profiles & Send Warnings' : 'Traiter les profils et envoyer des avertissements'}
          </Text>
        )}
      </TouchableOpacity>



      {result && Array.isArray(result) && (
        <ScrollView style={{ marginTop: 20, width: '100%' }}>
          {result.map((item: any, index: number) => renderCard({ item, index }))}
        </ScrollView>
      )}
    </View>
  );
};

export default WeeklyScoreCard;

const styles = StyleSheet.create({
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

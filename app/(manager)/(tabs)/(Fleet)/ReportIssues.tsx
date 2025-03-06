import React, { useState, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Switch, Alert, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import axios from 'axios';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, interpolateColor } from 'react-native-reanimated';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';

type Vehicle = {
  _id: string;
  vehicleNumber: string;
  model: string;
  type: string;
  geotab: string;
  vin: string;
  license: string;
  status?: string;
  statusColor?: string;
};

type Status = {
  _id: string;
  name: string;
  location: string;
  color: string;
};

type ReportIssue = {
  _id: string;
  vanId: string;
  statusId: string;
  drivable: boolean;
  note: string;
};



const ReportIssues = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [reportIssues, setReportIssues] = useState<ReportIssue[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isDrivable, setIsDrivable] = useState<boolean>(true);
  const [note, setNote] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentReport, setCurrentReport] = useState<ReportIssue | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const blinkOpacity = useSharedValue(1); // Clignotement
  const colorValue = useSharedValue(isDrivable ? 1 : 0); // Couleur
  const textScale = useSharedValue(1); // Valeur pour la taille


  useEffect(() => {
    if (isModalVisible) {
      blinkOpacity.value = withRepeat(
        withTiming(0.5, { duration: 500 }), // Clignotement
        -1,
        true
      );
      colorValue.value = isDrivable ? 1 : 0; // Couleur selon `isDrivable`
      textScale.value = withRepeat(
        withTiming(1.2, { duration: 500 }), // Agrandit légèrement
        -1,
        true
      );
    } else {
      blinkOpacity.value = 1; // Réinitialisation
      textScale.value = 1; // Réinitialisation de la taille
    }
  }, [isModalVisible, isDrivable]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: blinkOpacity.value,
    transform: [{ scale: textScale.value }], // Applique l'agrandissement
    color: interpolateColor(
      colorValue.value,
      [0, 1],
      ['red', 'green'] // Couleurs pour "No" et "Yes"
    ),
  }));

  // Réinitialiser brièvement l'animation lors du clic
  const handleSwitchChange = (value: boolean) => {
    setIsDrivable(value);
    blinkOpacity.value = 1; // Réinitialiser l'opacité
    textScale.value = 1; // Réinitialiser la taille
  };

  const fetchVehiclesAndIssues = async () => {
    setLoading(true);
    try {
      // Exécuter toutes les requêtes en parallèle avec Promise.all
      const [vehicleResponse, statusResponse, issuesResponse] = await Promise.all([
        axios.get(`${AppURL}/api/vehicles/all?dsp_code=${user?.dsp_code}`),
        axios.get(`${AppURL}/api/statuses/all?dsp_code=${user?.dsp_code}`),
        axios.get(`${AppURL}/api/reportIssues/all?dsp_code=${user?.dsp_code}`)
      ]);

      // Extraire les données des réponses
      const vehiclesData: Vehicle[] = vehicleResponse.data.data;
      const statusesData: Status[] = statusResponse.data;
      const issuesData: ReportIssue[] = issuesResponse.data;

      // Mettre à jour les véhicules avec les données des problèmes et statuts
      const updatedVehicles = vehiclesData.map((vehicle) => {
        const relatedIssue = issuesData.find((issue) => issue.vanId === vehicle._id);

        if (relatedIssue) {
          const statusColor = statusesData.find((status) => status._id === relatedIssue.statusId)?.color;
          return { ...vehicle, status: relatedIssue.statusId, statusColor: statusColor || '#fff' };
        } else {
          return { ...vehicle, statusColor: '#d3d3d3' }; // Gray for unassigned vans
        }
      });

      // Mettre à jour les états avec les données récupérées
      setVehicles(updatedVehicles);
      setStatuses(statusesData);
      setReportIssues(issuesData);

    } catch (error) {
      showAlert('Error', 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };


  const submitOrUpdateReportIssue = async () => {
    if (selectedVehicle && selectedStatus) {
      const reportData = {
        vanId: selectedVehicle._id,
        statusId: selectedStatus,
        drivable: isDrivable,
        note: note,
      };

      try {
        if (currentReport) {
          await axios.put(`${AppURL}/api/reportIssues/update/${currentReport._id}?dsp_code=${user?.dsp_code}`, reportData);
          showAlert(
            user?.language === 'English' ? 'Success' : 'Succès',
            user?.language === 'English' ? 'Report issue updated successfully' : 'Problème de rapport mis à jour avec succès'
          );

        } else {
          await axios.post(`${AppURL}/api/reportIssues/create?dsp_code=${user?.dsp_code}`, reportData);
          showAlert(
            user?.language === 'English' ? 'Success' : 'Succès',
            user?.language === 'English' ? 'New report issue created successfully' : 'Nouveau problème de rapport créé avec succès'
          );
        }

        await fetchVehiclesAndIssues();

        // Reset state
        setSelectedVehicle(null);
        setSelectedStatus('');
        setIsDrivable(true);
        setNote('');
        setIsModalVisible(false);
      } catch (error) {
        showAlert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English' ? 'Failed to submit or update report issue' : 'Échec de la soumission ou de la mise à jour du problème de rapport'
        );
      }
    } else {
      showAlert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English' ? 'Please select a vehicle and status' : 'Veuillez sélectionner un véhicule et un statut'
      );
    }
  };

  const openModalForVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    const relatedIssue = reportIssues.find((issue) => issue.vanId === vehicle._id);

    if (relatedIssue) {
      setCurrentReport(relatedIssue);
      setSelectedStatus(relatedIssue.statusId);
      setIsDrivable(relatedIssue.drivable);
      setNote(relatedIssue.note);
    } else {
      setCurrentReport(null);
      setSelectedStatus('');
      setIsDrivable(true);
      setNote('');
    }

    setIsModalVisible(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchVehiclesAndIssues();
    setRefreshing(false);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    fetchVehiclesAndIssues();
  }, []);

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder={user?.language === 'English' ? ' 🔍 Search by vehicle number or model' : ' 🔍 Rechercher par véhicule ou modèle'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {Platform.OS === 'web' && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {user?.language === 'English'
              ? `Total Vans: ${vehicles.length}`
              : `Nombre total de vans : ${vehicles.length}`}
          </Text>
          <Text style={styles.statsText}>
            {user?.language === 'English'
              ? `Drivable Vans: ${vehicles.filter(van => reportIssues.every(issue => issue.vanId !== van._id || issue.drivable)).length}`
              : `Vans conduisibles : ${vehicles.filter(van => reportIssues.every(issue => issue.vanId !== van._id || issue.drivable)).length}`}
          </Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#001933" />
      ) : (

        <FlatList
          data={vehicles.filter(vehicle =>
            vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.model.toLowerCase().includes(searchQuery.toLowerCase())
          )}

          keyExtractor={(item) => item._id}
          refreshControl={
            Platform.OS !== 'web' ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} /> : undefined
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, { backgroundColor: item.statusColor || '#fff' }]}
              onPress={() => openModalForVehicle(item)}
            >
              <View style={styles.vehicleHeader}>
                <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
                <Text style={styles.drivableText}>
                  {user?.language === 'English'
                    ? `Drivable: ${reportIssues.find((issue) => issue.vanId === item._id)?.drivable ? 'Yes' : 'No'}`
                    : `Conduisible: ${reportIssues.find((issue) => issue.vanId === item._id)?.drivable ? 'Oui' : 'Non'}`}
                </Text>
              </View>
              {item.status && (
                <Text style={styles.statusText}>
                  {user?.language === 'English'
                    ? `Status: ${statuses.find((status) => status._id === item.status)?.name}`
                    : `Statut: ${statuses.find((status) => status._id === item.status)?.name}`}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {selectedVehicle && (
        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>

              <Text style={styles.modalTitle}>
                {user?.language === 'English'
                  ? `Assign or Modify Status for ${selectedVehicle.vehicleNumber}`
                  : `Attribuer ou Modifier le Statut pour ${selectedVehicle.vehicleNumber}`}
              </Text>

              <Text>
                {user?.language === 'English' ? 'Select a status:' : 'Sélectionner un statut :'}
              </Text>

              <FlatList
                data={statuses}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      { backgroundColor: selectedStatus === item._id ? item.color : '#f0f0f0' },
                    ]}
                    onPress={() => setSelectedStatus(item._id)}
                  >
                    <Text>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />

              <View style={styles.switchContainer}>
                <Animated.Text style={[styles.drivableText, animatedStyle]}>
                  {user?.language === 'English' ? `Drivable: ${isDrivable ? 'Yes' : 'No'}` : `Conduisible: ${isDrivable ? 'Oui' : 'Non'}`}
                </Animated.Text>
                <Animated.View style={animatedStyle}>
                  <Switch value={isDrivable} onValueChange={handleSwitchChange} />
                </Animated.View>
              </View>


              <TextInput
                style={styles.input}
                placeholder={user?.language === 'English' ? 'Add a note (optional)' : 'Ajouter une note (facultatif)'}
                value={note}
                onChangeText={setNote}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.submitButton} onPress={submitOrUpdateReportIssue}>
                  <Text style={styles.submitButtonText}>
                    {user?.language === 'English' ? 'Submit' : 'Soumettre'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>
                    {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

export default ReportIssues;

const styles = StyleSheet.create({

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001933',
  },
  searchBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#f0f0f0', // Gris clair pour contraste léger sur fond blanc
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 10,
    height: 40,
    borderColor: '#001933', // Bordure bleu foncé
    borderWidth: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white', // Arrière-plan blanc
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#001933',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#001933', // Bleu foncé pour le bouton
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  refreshButtonText: {
    color: '#fff', // Texte blanc pour contraste sur le bouton bleu
    fontWeight: 'bold',
  },
  item: {
    backgroundColor: '#f0f4f8', // Arrière-plan gris clair pour l'item
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    elevation: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
  },
  drivableText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 10, // Espace avec le switch
  },

  statusText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Fond sombre transparent
  },
  modalContent: {
    backgroundColor: 'white', // Arrière-plan blanc pour le modal
    padding: 20,
    borderRadius: 15,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#001933', // Texte bleu foncé pour le titre modal
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
  statusOption: {
    backgroundColor: '#f0f4f8', // Gris clair pour les options de statut
    padding: 10,
    marginVertical: 5,
    borderRadius: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  submitButton: {
    backgroundColor: '#001933', // Vert pour le bouton Submit
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2, // Ombre pour Android
    shadowColor: '#000', // Ombre pour iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  cancelButton: {
    backgroundColor: '#7f8c8d', // Rouge pour le bouton Cancel
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cancelButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

});

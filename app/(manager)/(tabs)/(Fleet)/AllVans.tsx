import React, { useEffect, useState, useCallback } from 'react';
import { FlatList, StyleSheet, Text, View, TouchableOpacity, Modal, Pressable, Alert, TextInput, Button, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import axios from 'axios';
import { Platform } from 'react-native';
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
};


const AllVans = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredVehicles = vehicles.filter((vehicle) =>
    (vehicle.vehicleNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase()) || '') ||
    (vehicle.type?.toLowerCase().includes(searchQuery.toLowerCase()) || '')
  );



  const [vehicleDetails, setVehicleDetails] = useState({
    vehicleNumber: '',
    model: '',
    type: '',
    geotab: '',
    vin: '',
    license: '',
  });

  // État pour le nouveau véhicule
  const [newVehicle, setNewVehicle] = useState({
    vehicleNumber: '',
    model: '',
    type: '',
    geotab: '',
    vin: '',
    license: '',
  });

  // Fonction pour gérer l'ajout du véhicule
  const handleAddVehicle = async () => {
    // Vérification des champs obligatoires
    if (!newVehicle.vehicleNumber || !newVehicle.model || !newVehicle.type ||
      !newVehicle.geotab || !newVehicle.vin || !newVehicle.license) {

      const errorMessage = user?.language === 'English'
        ? 'All fields are required. Please fill in all the information.'
        : 'Tous les champs sont obligatoires. Veuillez remplir toutes les informations.';

      Alert.alert('Error', errorMessage);
      if (Platform.OS === 'web') window.alert(errorMessage);
      return;
    }

    try {
      const response = await axios.post(`${AppURL}/api/vehicles/add?dsp_code=${user?.dsp_code}`, newVehicle);

      if (response.status === 200) {
        setVehicles([...vehicles, response.data]); // Ajouter le véhicule
        setAddModalVisible(false); // Fermer le modal après création réussie

        const successMessage = user?.language === 'English'
          ? 'Vehicle added successfully!'
          : 'Véhicule ajouté avec succès !';

        Alert.alert('Success', successMessage);
        if (Platform.OS === 'web') window.alert(successMessage);

        // Réinitialiser les champs
        setNewVehicle({
          vehicleNumber: '',
          model: '',
          type: '',
          geotab: '',
          vin: '',
          license: '',
        });

        await fetchVehicles();
      } else {
        const errorMessage = user?.language === 'English'
          ? 'Failed to add vehicle.'
          : 'Échec de l’ajout du véhicule.';

        Alert.alert('Error', errorMessage);
        if (Platform.OS === 'web') window.alert(errorMessage);
      }
    } catch (error) {
      const errorMessage = user?.language === 'English'
        ? 'An error occurred while adding the vehicle.'
        : 'Une erreur est survenue lors de l’ajout du véhicule.';

      Alert.alert('Error', errorMessage);
      if (Platform.OS === 'web') window.alert(errorMessage);
    }
  };




  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${AppURL}/api/vehicles/all?dsp_code=${user?.dsp_code}`);
      setVehicles(response.data.data);
      setError(null);
    } catch (error) {
      setError('An error occurred while fetching vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchVehicles();
    setRefreshing(false);
  }, []);

  const handleVanClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleDetails({
      vehicleNumber: vehicle.vehicleNumber,
      model: vehicle.model,
      type: vehicle.type,
      geotab: vehicle.geotab,
      vin: vehicle.vin,
      license: vehicle.license,
    });
    setModalVisible(true);
  };

  const handleDelete = async (_id: string) => {
    const confirmationMessage = user?.language === 'English'
      ? 'Are you sure you want to delete this vehicle ?'
      : 'Êtes-vous sûr de vouloir supprimer ce véhicule ?';

    const successMessage = user?.language === 'English'
      ? 'Vehicle deleted successfully.'
      : 'Véhicule supprimé avec succès.';

    const errorMessage = user?.language === 'English'
      ? 'Failed to delete the vehicle. Please try again.'
      : 'Échec de la suppression du véhicule. Veuillez réessayer.';

    // Confirmation pour mobile
    if (Platform.OS !== 'web') {
      return Alert.alert(
        user?.language === 'English' ? 'Confirmation' : 'Confirmation',
        confirmationMessage,
        [
          { text: user?.language === 'English' ? 'Cancel' : 'Annuler', style: 'cancel' },
          { text: user?.language === 'English' ? 'Delete' : 'Supprimer', style: 'destructive', onPress: async () => await confirmDeleteVehicle(_id, successMessage, errorMessage) },
        ]
      );
    }

    // Confirmation pour Web
    if (window.confirm(confirmationMessage)) {
      await confirmDeleteVehicle(_id, successMessage, errorMessage);
    }
  };


  const confirmDeleteVehicle = async (_id: string, successMessage: string, errorMessage: string) => {
    try {
      // Supprimer le véhicule
      await axios.delete(`${AppURL}/api/vehicles/${_id}?dsp_code=${user?.dsp_code}`);

      // Supprimer les rapports associés (ignorer les erreurs s'ils n'existent pas)
      try {
        await axios.delete(`${AppURL}/api/reportIssues/van/${_id}?dsp_code=${user?.dsp_code}`);
      } catch (reportError) {
        if (axios.isAxiosError(reportError)) {
          console.warn('Axios error during report deletion:', reportError.message);
        } else if (reportError instanceof Error) {
          console.warn('Unexpected error during report deletion:', reportError.message);
        } else {
          console.warn('Unknown error during report deletion:', reportError);
        }
      }

      // Mettre à jour l'état local
      setVehicles(vehicles.filter(vehicle => vehicle._id !== _id));
      setModalVisible(false);

      Alert.alert('Success', successMessage);
      if (Platform.OS === 'web') window.alert(successMessage);
    } catch (error) {
      Alert.alert('Error', errorMessage);
      if (Platform.OS === 'web') window.alert(errorMessage);
    }
  };





  const handleUpdate = async () => {
    if (selectedVehicle) {
      try {
        await axios.put(`${AppURL}/api/vehicles/${selectedVehicle._id}?dsp_code=${user?.dsp_code}`, vehicleDetails);
        setVehicles(vehicles.map(vehicle =>
          vehicle._id === selectedVehicle._id ? { ...selectedVehicle, ...vehicleDetails } : vehicle
        ));
        await fetchVehicles();
        setModalVisible(false);

        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Vehicle updated successfully.'
            : 'Véhicule mis à jour avec succès.'
        );

        window.alert(
          user?.language === 'English'
            ? 'Vehicle updated successfully.'
            : 'Véhicule mis à jour avec succès.'
        );

      } catch (error) {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to update the vehicle.'
            : 'Échec de la mise à jour du véhicule.'
        );

        window.alert(
          user?.language === 'English'
            ? 'Failed to update the vehicle.'
            : 'Échec de la mise à jour du véhicule.'
        );
      }
    }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001933" />
        <Text style={styles.loadingText}>
          {user?.language === 'English' ? 'Loading Data...' : 'Chargement des données...'}
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder={user?.language === "English" ? " 🔍 Search Vehicles..." : " 🔍 Rechercher un véhicule..."}
          placeholderTextColor="#aaa"
          value={searchQuery}
          onChangeText={(text) => setSearchQuery(text)}
        />
      </View>


      <FlatList
        data={filteredVehicles}
        keyExtractor={(item) => item._id || item.vin || `${item.vehicleNumber}-${Math.random()}`}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleVanClick(item)}>
            <View style={styles.item}>
              <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
              <Text style={styles.vehicleModel}>{item.type}</Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#001933']} />
          ) : undefined
        }
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setAddModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={addModalVisible}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              <Text style={styles.modalTitle}>
                {user?.language === 'English' ? 'Add New Vehicle' : 'Ajouter un nouveau véhicule'}
              </Text>

              <Text style={styles.label}>
                {user?.language === 'English' ? 'Vehicle Number' : 'Numéro du véhicule'}
              </Text>

              <TextInput
                style={styles.input}
                value={newVehicle.vehicleNumber}
                onChangeText={(text) => setNewVehicle({ ...newVehicle, vehicleNumber: text })}
                placeholder={
                  user?.language === 'English' ? 'Enter vehicle number' : 'Entrez le numéro du véhicule'
                }
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>
                {user?.language === 'English' ? 'Model' : 'Modèle'}
              </Text>

              <TextInput
                style={styles.input}
                value={newVehicle.model}
                onChangeText={(text) => setNewVehicle({ ...newVehicle, model: text })}
                placeholder={
                  user?.language === 'English' ? 'Enter model' : 'Entrez le modèle'
                }
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>Type</Text>
              <TextInput
                style={styles.input}
                value={newVehicle.type}
                onChangeText={(text) => setNewVehicle({ ...newVehicle, type: text })}
                placeholder={
                  user?.language === 'English' ? 'Enter type' : 'Entrez le type'
                }
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>GEOTAB</Text>
              <TextInput
                style={styles.input}
                value={newVehicle.geotab}
                onChangeText={(text) => setNewVehicle({ ...newVehicle, geotab: text })}
                placeholder={
                  user?.language === 'English' ? 'Enter GEOTAB' : 'Entrez GEOTAB'
                }
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>VIN</Text>
              <TextInput
                style={styles.input}
                value={newVehicle.vin}
                onChangeText={(text) => setNewVehicle({ ...newVehicle, vin: text })}
                placeholder={user?.language === 'English' ? 'Enter VIN' : 'Entrez le VIN'}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>License</Text>
              <TextInput
                style={styles.input}
                value={newVehicle.license}
                onChangeText={(text) => setNewVehicle({ ...newVehicle, license: text })}
                placeholder={user?.language === 'English' ? 'Enter License' : 'Entrez la Licence'}
                placeholderTextColor="#aaa"
              />

              <View style={styles.buttonContainerAdd}>
                <Pressable
                  style={styles.buttonAdd}
                  onPress={handleAddVehicle}
                >
                  <Text style={styles.buttonText}>
                    {user?.language === 'English' ? 'Submit' : 'Soumettre'}
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.buttonCloseAdd}
                  onPress={() => setAddModalVisible(false)}
                >
                  <Text style={styles.buttonText}>
                    {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>




      {selectedVehicle && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <Text style={styles.modalTitle}>
                  {user?.language === 'English' ? 'Edit Vehicle Details' : 'Modifier les Détails du Véhicule'}
                </Text>

                <Text style={styles.label}>
                  {user?.language === 'English' ? 'Vehicle Number' : 'Numéro du Véhicule'}
                </Text>

                <TextInput
                  style={styles.input}
                  value={vehicleDetails.vehicleNumber}
                  onChangeText={(text) =>
                    setVehicleDetails({ ...vehicleDetails, vehicleNumber: text })
                  }
                  placeholder="Enter vehicle number"
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.label}>
                  {user?.language === 'English' ? 'Model' : 'Modèle'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={vehicleDetails.model}
                  onChangeText={(text) =>
                    setVehicleDetails({ ...vehicleDetails, model: text })
                  }
                  placeholder="Enter model"
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.label}>Type</Text>
                <TextInput
                  style={styles.input}
                  value={vehicleDetails.type}
                  onChangeText={(text) =>
                    setVehicleDetails({ ...vehicleDetails, type: text })
                  }
                  placeholder="Enter type"
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.label}>GEOTAB</Text>
                <TextInput
                  style={styles.input}
                  value={vehicleDetails.geotab}
                  onChangeText={(text) =>
                    setVehicleDetails({ ...vehicleDetails, geotab: text })
                  }
                  placeholder="Enter GEOTAB"
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.label}>VIN</Text>
                <TextInput
                  style={styles.input}
                  value={vehicleDetails.vin}
                  onChangeText={(text) =>
                    setVehicleDetails({ ...vehicleDetails, vin: text })
                  }
                  placeholder="Enter VIN"
                  placeholderTextColor="#aaa"
                />

                <Text style={styles.label}>License</Text>
                <TextInput
                  style={styles.input}
                  value={vehicleDetails.license}
                  onChangeText={(text) =>
                    setVehicleDetails({ ...vehicleDetails, license: text })
                  }
                  placeholder="Enter License"
                  placeholderTextColor="#aaa"
                />

                <View style={styles.buttonContainer}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: pressed ? '#005c99' : '#001933' },
                    ]}
                    onPress={handleUpdate}
                  >
                    <Text style={styles.buttonText}>
                      {user?.language === 'English' ? 'Update' : 'Mettre à Jour'}
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.button,
                      { backgroundColor: pressed ? '#cc0000' : '#ff3333' },
                    ]}
                    onPress={() => handleDelete(selectedVehicle._id)}
                  >
                    <Text style={styles.buttonText}>
                      {user?.language === 'English' ? 'Delete' : 'Supprimer'}
                    </Text>
                  </Pressable>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.buttonClose,
                    { backgroundColor: pressed ? '#333' : '#666' },
                  ]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>
                    {user?.language === 'English' ? 'Close' : 'Fermer'}
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

export default AllVans;

const styles = StyleSheet.create({
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
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#001933',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffff', // Arrière-plan gris clair
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#001933',
    textAlign: 'center',
  },
  item: {
    backgroundColor: '#fff', // Fond blanc pour les items
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  vehicleNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
  },
  vehicleModel: {
    fontSize: 16,
    color: '#001933', // Texte gris pour contraste subtil
    marginTop: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffff', // Arrière-plan gris clair
  },
  loadingText: {
    color: '#001933', // Texte foncé pour contraste
    fontSize: 18,
    marginTop: 10,
  },
  errorText: {
    color: '#ff4c4c', // Rouge vif pour les erreurs
    fontSize: 18,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fond sombre semi-transparent
  },
  modalContent: {
    width: '90%', // Limite la largeur du modal
    maxHeight: '80%', // Limite la hauteur du modal
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  scrollViewContent: {
    paddingBottom: 20, // Ajout de l'espace pour le défilement fluide
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#001933', // Texte bleu foncé
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#001933', // Texte foncé
  },
  input: {
    borderWidth: 1,
    borderColor: '#001933',
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    color: '#001933', // Texte foncé
  },
  buttonContainer: {
    flexDirection: 'row', // Les enfants sont disposés en ligne
    justifyContent: 'space-between', // Espace entre les boutons
    alignItems: 'center', // Centrer les boutons verticalement
    marginTop: 20, // Espacement supérieur
  },
  buttonContainerAdd: {
    flexDirection: 'row', // Alignement horizontal des boutons
    justifyContent: 'space-between', // Espacement uniforme entre les boutons
    alignItems: 'center', // Centrer les boutons verticalement
    marginTop: 20, // Espacement supérieur
  },
  button: {
    flex: 1, // Les boutons partagent l'espace disponible
    height: 50, // Hauteur fixe pour les boutons
    marginHorizontal: 10, // Espacement horizontal entre les boutons
    borderRadius: 8, // Coins arrondis
    backgroundColor: '#001933', // Couleur de fond
    justifyContent: 'center', // Centrer le contenu verticalement
    alignItems: 'center', // Centrer le contenu horizontalement
  },
  buttonAdd: {
    flex: 1, // Partage équitable de l'espace
    height: 50, // Hauteur fixe des boutons
    marginHorizontal: 5, // Espacement horizontal entre les boutons
    borderRadius: 8, // Coins arrondis
    backgroundColor: '#001933', // Couleur de fond
    justifyContent: 'center', // Centrage vertical
    alignItems: 'center', // Centrage horizontal
  },
  buttonText: {
    color: '#fff', // Texte blanc pour contraste sur le bouton bleu foncé
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buttonClose: {
    marginTop: 20,
    height: 50, // Ajout explicite de hauteur
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#001933',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonCloseAdd: {
    flex: 1, // Partage équitable de l'espace
    height: 50, // Hauteur fixe des boutons
    marginHorizontal: 5, // Espacement horizontal entre les boutons
    borderRadius: 8, // Coins arrondis
    backgroundColor: '#666', // Couleur de fond (gris pour annuler)
    justifyContent: 'center', // Centrage vertical
    alignItems: 'center', // Centrage horizontal
  },
});

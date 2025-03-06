import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
  Alert
} from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';

// Définir le type pour les employés
type Employee = {
  _id: string;
  name: string;
  familyName: string;
  expoPushToken: string;
  tel: string;
};

// Définir le type pour une route créée
type Road = {
  _id: string;
  roadNumber: number;
  startTime: string;
  date: string;
  offerName: string;
  valid: boolean;
  seen: string[];
  interested: string[];
  notInterested: string[];
};

const ExtratRoutes = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [employees, setEmployees] = useState<Employee[]>([]); // Liste des employés
  const [selectedDate, setSelectedDate] = useState(new Date()); // Date affichée
  const [modalVisible, setModalVisible] = useState(false); // Modal de création
  const [roadNumber, setRoadNumber] = useState(''); // Numéro de route
  const [startTime, setStartTime] = useState(''); // Heure de départ
  const [roads, setRoads] = useState<Road[]>([]); // Routes récupérées
  const [isLoading, setIsLoading] = useState(false); // Chargement des employés et routes
  const [offerName, setOfferName] = useState(''); // Offer name for the road
  const [selectedRoad, setSelectedRoad] = useState<Road | null>(null); // Selected road for editing
  const [editModalVisible, setEditModalVisible] = useState(false); // Edit modal visibility
  const [ReactionsModalVisible, setReactionsModalVisible] = useState(false); // Edit modal visibility


  // Charger les employés au démarrage
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get<Employee[]>(`${AppURL}/api/employee`, {
          params: {
            dsp_code: user?.dsp_code, // Ajout de dsp_code
          },
        });
        setEmployees(response.data);
      } catch (err) {
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, [user?.dsp_code]); // Ajout de `user?.dsp_code` comme dépendance pour éviter les erreurs


  // Charger les routes pour la date sélectionnée
  useEffect(() => {
    const fetchRoadsByDate = async (date: string) => {
      try {
        setIsLoading(true); // Affiche un indicateur de chargement
        const response = await axios.get<Road[]>(`${AppURL}/api/roads/bydate/get`, {
          params: {
            date,
            dsp_code: user?.dsp_code, // Ajout de dsp_code
          },
        });

        if (response.data && response.data.length > 0) {
          setRoads(response.data); // Met à jour les routes récupérées
        } else {
          setRoads([]); // Aucune route trouvée
        }
      } catch (err: unknown) {
        // Gestion explicite des erreurs 404
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setRoads([]); // Réinitialise à une liste vide
        } else {
          // Affiche uniquement les autres erreurs
          const errorMessage = err instanceof Error ? err.message : String(err);
        }
      } finally {
        setIsLoading(false); // Arrête l'indicateur de chargement
      }
    };

    const currentDate = selectedDate.toISOString().split('T')[0]; // Formate la date au format AAAA-MM-JJ
    if (currentDate) {
      fetchRoadsByDate(currentDate); // Appelle la fonction avec la date sélectionnée
    }
  }, [selectedDate, user?.dsp_code]); // Ajout de `user?.dsp_code` comme dépendance

  const fetchRoadReactions = async (roadId: string) => {
    try {
      const response = await axios.get<Road>(`${AppURL}/api/roads/${roadId}`, {
        params: {
          dsp_code: user?.dsp_code, // Ajout de dsp_code pour sécuriser la requête
        },
      });
      // Mettre à jour la route sélectionnée avec les nouvelles réactions
      setSelectedRoad(response.data);
    } catch (err) {
    }
  };

  const confirmDeleteOffer = async (successMessage: string, errorMessage: string) => {
    try {
      await axios.delete(`${AppURL}/api/roads/${selectedRoad?._id}`, {
        params: { dsp_code: user?.dsp_code },
      });

      Alert.alert('Success', successMessage);
      if (Platform.OS === 'web') window.alert(successMessage);

      setRoads((prev) => prev.filter((road) => road.roadNumber !== selectedRoad?.roadNumber));
      setEditModalVisible(false);
    } catch (err) {
      Alert.alert('Error', errorMessage);
      if (Platform.OS === 'web') window.alert(errorMessage);
    }
  };




  const handleCreateRoad = async () => {
    if (!roadNumber || !startTime || !offerName) {
      const errorMessage = user?.language === 'English'
        ? 'Please fill in all required fields'
        : 'Veuillez remplir tous les champs obligatoires';

      Alert.alert('Error', errorMessage);
      if (Platform.OS === 'web') window.alert(errorMessage);
      return;
    }

    const roadData = {
      roadNumber: parseInt(roadNumber, 10),
      startTime,
      date: selectedDate.toISOString().split('T')[0], // Formate la date (AAAA-MM-JJ)
      offerName,
      seen: [],
      interested: [],
      notInterested: [],
      valid: true,
      employeeExpo: employees.map(emp => emp.expoPushToken), // Envoie tous les tokens des employés
      dsp_code: user?.dsp_code,
    };

    try {
      const response = await axios.post(`${AppURL}/api/roads/create`, roadData);

      const successMessage = user?.language === 'English'
        ? 'Offer created successfully!'
        : 'Offre créée avec succès !';

      Alert.alert('Success', successMessage);
      if (Platform.OS === 'web') window.alert(successMessage);

      // Ajouter l'offre créée dans la liste
      const newRoad: Road = {
        _id: response.data._id, // Récupérez l'ID de la réponse du backend
        roadNumber: roadData.roadNumber,
        startTime: roadData.startTime,
        date: roadData.date,
        offerName: roadData.offerName,
        valid: roadData.valid,
        seen: [],
        interested: [],
        notInterested: [],
      };

      setRoads(prev => [newRoad, ...prev]);
      setModalVisible(false);
      resetForm();
    } catch (err) {
      const errorMessage = user?.language === 'English'
        ? 'Failed to create road. Please try again.'
        : 'Échec de la création de la route. Veuillez réessayer.';

      Alert.alert('Error', errorMessage);
      if (Platform.OS === 'web') window.alert(errorMessage);
    }
  };


  // Réinitialiser le formulaire
  const resetForm = () => {
    setRoadNumber('');
    setStartTime('');
    setOfferName('');
  };

  // Balayer entre les jours
  const changeDay = (direction: 1 | -1) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  return (
    <View style={styles.container}>
      {/* Barre de navigation des jours */}
      <View style={styles.dateContainer}>
        <TouchableOpacity onPress={() => changeDay(-1)} style={styles.navButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {selectedDate.toISOString().split('T')[0]}
        </Text>
        <TouchableOpacity onPress={() => changeDay(1)} style={styles.navButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bouton pour ajouter un nouveau road */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      {/* Liste des routes récupérées */}
      <Text style={styles.sectionTitle}>
        {user?.language === 'English'
          ? 'Offers for the selected date'
          : 'Offres pour la date sélectionnée'}
      </Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#001933" style={styles.loadingIndicator} />
      ) : roads.length > 0 ? (
        <FlatList
          data={roads}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.roadCard}>
              {/* Rendre toute la carte cliquable */}
              <TouchableOpacity
                style={styles.roadInfoContainer}
                onPress={() => {
                  setSelectedRoad(item);
                  setEditModalVisible(true);
                }}
              >
                <View style={styles.roadInfo}>
                  <Text style={styles.roadNumber}>{item.offerName}</Text>
                  <Text style={styles.roadDetails}>
                    {user?.language === 'English' ? 'routes Number' : 'nembre des routes'}: {item.roadNumber}
                  </Text>
                  <Text style={styles.roadDetails}>
                    {user?.language === 'English' ? 'Start Time' : 'Heure de début'}: {item.startTime}
                  </Text>
                  <Text style={styles.roadDetails}>
                    {user?.language === 'English' ? 'Valid' : 'Valide'}: {item.valid ? 'Yes' : 'Non'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Bouton Reactions */}
              <TouchableOpacity
                style={styles.reactionsButton}
                onPress={async () => {
                  setSelectedRoad(item);
                  await fetchRoadReactions(item._id); // Récupère et met à jour les réactions avant de continuer
                  setEditModalVisible(false); // Assurez-vous de fermer d'autres modals
                  setReactionsModalVisible(true); // Ouvre le modal des réactions
                }}
              >

                <Text style={styles.reactionsButtonText}>
                  {user?.language === 'English' ? 'Reactions' : 'Réactions'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      ) : (
        <Text style={styles.emptyText}>
          {user?.language === 'English' ? 'No offers for the selected date.' : 'Aucune offre pour la date sélectionnée.'}
        </Text>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Create a new offer' : 'Créer une nouvelle offre'}
            </Text>
            {/* Input for the offer name */}
            <TextInput
              style={styles.input}
              placeholder={
                user?.language === 'English' ? 'Offer name' : 'Nom de l\'offre'
              }
              value={offerName}
              onChangeText={setOfferName}
            />


            {/* Input pour le roadNumber */}
            <TextInput
              style={styles.input}
              placeholder={
                user?.language === 'English' ? 'routes number' : 'nembre des routes'
              }
              keyboardType="numeric"
              value={roadNumber}
              onChangeText={setRoadNumber}
            />

            {/* Input pour le startTime */}
            <TextInput
              style={styles.input}
              placeholder={
                user?.language === 'English' ? 'Departure time (e.g., 13:00)' : 'Heure de départ (ex: 13:00)'
              }
              value={startTime}
              onChangeText={setStartTime}
            />

            {/* Boutons d'action */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateRoad}>
                <Text style={styles.createButtonText}>
                  {user?.language === 'English' ? 'Create' : 'Créer'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>
                  {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainerUpdate}>
          <View style={styles.modalContentUpdate}>
            <Text style={styles.modalTitleUpdate}>
              {user?.language === 'English' ? 'Edit offer' : 'Modifier l\'offre'}
            </Text>
            {/* Input for Offer Name */}
            <TextInput
              style={styles.input}
              placeholder={
                user?.language === 'English' ? 'Offer name' : 'Nom de l\'offre'
              }
              value={selectedRoad?.offerName || ''}
              onChangeText={(text) => setSelectedRoad((prev) => prev ? { ...prev, offerName: text } : null)}
            />

            {/* Input for Road Number */}
            <TextInput
              style={styles.inputUpdate}
              placeholder={
                user?.language === 'English' ? 'routes number' : 'nembre des routes'
              }
              keyboardType="numeric"
              value={selectedRoad?.roadNumber.toString() || ''}
              onChangeText={(text) =>
                setSelectedRoad((prev) => prev ? { ...prev, roadNumber: parseInt(text, 10) } : null)
              }
            />

            {/* Input for Start Time */}
            <TextInput
              style={styles.inputUpdate}
              placeholder={
                user?.language === 'English' ? 'Departure time (e.g., 08:00)' : 'Heure de départ (ex: 08:00)'
              }
              value={selectedRoad?.startTime || ''}
              onChangeText={(text) => setSelectedRoad((prev) => prev ? { ...prev, startTime: text } : null)}
            />

            {/* Toggle Valid Status */}
            <TouchableOpacity
              style={[styles.toggleButtonUpdate, selectedRoad?.valid ? styles.validButtonUpdate : styles.invalidButtonUpdate]}
              onPress={() =>
                setSelectedRoad((prev) => prev ? { ...prev, valid: !prev.valid } : null)
              }
            >
              <Text style={styles.toggleButtonTextUpdate}>
                {user?.language === 'English'
                  ? (selectedRoad?.valid ? 'Mark as Invalid' : 'Mark as Valid')
                  : (selectedRoad?.valid ? 'Marquer comme invalide' : 'Marquer comme valide')}
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {/* Save Button */}
              <TouchableOpacity
                style={styles.createButtonUpdate}
                onPress={async () => {
                  if (selectedRoad) {
                    try {
                      const updatedRoadData = {
                        ...selectedRoad,
                        dsp_code: user?.dsp_code, // Ajout de dsp_code
                      };

                      await axios.put(`${AppURL}/api/roads/${selectedRoad._id}`, updatedRoadData);
                      alert(user?.language === 'English'
                        ? 'Offer successfully updated!'
                        : 'Offre modifiée avec succès !');

                      setRoads((prevRoads) => {
                        const updatedRoads = prevRoads.map((road) =>
                          road._id === selectedRoad._id ? { ...road, ...updatedRoadData } : road
                        );
                        return [...updatedRoads]; // Ensure a new array reference
                      });

                      setEditModalVisible(false);
                    } catch (err) {
                      alert(user?.language === 'English'
                        ? 'Error updating road. Please try again.'
                        : 'Erreur lors de la mise à jour de la route. Veuillez réessayer.');
                    }
                  }
                }}
              >
                <Text style={styles.createButtonTextUpdate}>
                  {user?.language === 'English' ? 'Update' : 'Mettre à jour'}
                </Text>
              </TouchableOpacity>

              {/* Delete Button */}
              <TouchableOpacity
                style={styles.deleteButtonUpdate}
                onPress={() => {
                  if (!selectedRoad) return;

                  const confirmationMessage = user?.language === 'English'
                    ? 'Are you sure you want to delete this offer?'
                    : 'Êtes-vous sûr de vouloir supprimer cette offre ?';

                  const successMessage = user?.language === 'English'
                    ? 'Offer successfully deleted!'
                    : 'Offre supprimée avec succès !';

                  const errorMessage = user?.language === 'English'
                    ? 'Error deleting road. Please try again.'
                    : 'Erreur lors de la suppression de la route. Veuillez réessayer.';

                  // Confirmation pour mobile
                  if (Platform.OS !== 'web') {
                    return Alert.alert(
                      user?.language === 'English' ? 'Confirmation' : 'Confirmation',
                      confirmationMessage,
                      [
                        { text: user?.language === 'English' ? 'Cancel' : 'Annuler', style: 'cancel' },
                        { text: user?.language === 'English' ? 'Delete' : 'Supprimer', style: 'destructive', onPress: async () => await confirmDeleteOffer(successMessage, errorMessage) },
                      ]
                    );
                  }

                  // Confirmation pour Web
                  if (window.confirm(confirmationMessage)) {
                    confirmDeleteOffer(successMessage, errorMessage);
                  }
                }}
              >
                <Text style={styles.deleteButtonTextUpdate}>
                  {user?.language === 'English' ? 'Delete' : 'Supprimer'}
                </Text>
              </TouchableOpacity>


              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButtonUpdate}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonTextUpdate}>
                  {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={ReactionsModalVisible} animationType="slide" transparent>
        <View style={styles.modalContainerreactions}>
          <View style={styles.modalContentreactions}>
            <Text style={styles.modalTitlereactions}>
              {user?.language === 'English' ? 'Employee Reactions' : 'Réactions des employés'}
            </Text>
            {selectedRoad && employees.length > 0 && (
              <>
                {/* Legend */}
                <View style={styles.legendContainer}>
                  <View style={[styles.legendCircle, { backgroundColor: 'green' }]} />
                  <Text style={styles.legendText}>Interested</Text>
                  <View style={[styles.legendCircle, { backgroundColor: 'red' }]} />
                  <Text style={styles.legendText}>Not Interested</Text>
                </View>

                {/* Display counts for seen and interested employees */}
                <Text style={styles.modalTextreactions}>
                  {user?.language === 'English'
                    ? `Total Seen: ${selectedRoad.seen.length}         Total Interested: ${selectedRoad.interested.length}`
                    : `Total Vu: ${selectedRoad.seen.length}         Total Intéressé: ${selectedRoad.interested.length}`}
                </Text>

                {/* FlatList with maxHeight for scrolling */}
                <FlatList
                  style={styles.FlatListContainer}
                  data={employees
                    .filter((employee) =>
                      selectedRoad.seen.includes(employee._id) ||
                      selectedRoad.interested.includes(employee._id) ||
                      selectedRoad.notInterested.includes(employee._id)
                    )
                    .map((employee) => {
                      const isSeen = selectedRoad.seen.includes(employee._id);
                      const isInterested = selectedRoad.interested.includes(employee._id);
                      const isNotInterested = selectedRoad.notInterested.includes(employee._id);

                      return {
                        name: `${employee.name} ${employee.familyName}`,
                        tel: employee.tel, // Include the phone number separately
                        backgroundColor: isInterested
                          ? 'green'
                          : isNotInterested
                            ? 'red'
                            : '#D3D3D3',
                        status: isSeen ? "👀 Seen" : "",
                      };
                    })}
                  keyExtractor={(item, index) => `${item.name}-${index}`}
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.reactionItem,
                        { backgroundColor: item.backgroundColor },
                      ]}
                    >
                      <Text style={styles.reactionText}>{item.name}</Text>
                      <Text
                        style={styles.reactionTel}
                        onLongPress={() => {
                          Clipboard.setString(item.tel); // Copy phone number to clipboard
                        }}
                      >
                        Tel: {item.tel}
                      </Text>
                      <Text style={styles.reactionStatus}>{item.status}</Text>
                    </View>
                  )}
                />

              </>
            )}
            <TouchableOpacity
              style={styles.closeButtonreactions}
              onPress={() => setReactionsModalVisible(false)}
            >
              <Text style={styles.buttonTextreactions}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>




    </View>
  );
};

export default ExtratRoutes;

const styles = StyleSheet.create({
  roadCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roadInfo: {
    flexDirection: 'column',
  },
  roadNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 5,
  },
  roadDetails: {
    fontSize: 14,
    color: '#001933',
  },
  separator: {
    height: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  dateContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  navButton: {
    padding: 10,
    backgroundColor: "#001933",
    borderRadius: 50,
  },
  dateText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933',
  },
  addButton: {
    backgroundColor: '#001933',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 30,
    right: 30,
    elevation: 5,
    zIndex: 10, // Ensure button is on top
  },
  addButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 10,
  },
  roadItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roadText: {
    fontSize: 16,
    color: '#001933',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#001933',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#001933',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  createButton: {
    backgroundColor: '#001933',
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    padding: 10,
    borderRadius: 5,
    width: '48%',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingIndicator: {
    marginTop: 20,
  },
  modalContainerUpdate: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContentUpdate: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 15,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitleUpdate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputUpdate: {
    borderWidth: 1,
    borderColor: '#001933',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  toggleButtonUpdate: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  validButtonUpdate: {
    backgroundColor: '#28a745',
  },
  invalidButtonUpdate: {
    backgroundColor: '#dc3545',
  },
  toggleButtonTextUpdate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainerUpdate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  createButtonUpdate: {
    backgroundColor: '#001933',
    padding: 12,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
  },
  cancelButtonUpdate: {
    backgroundColor: '#6c757d',
    padding: 12,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
  },
  deleteButtonUpdate: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 10,
    width: '30%',
    alignItems: 'center',
  },
  createButtonTextUpdate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonTextUpdate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButtonTextUpdate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  reactionsButton: {
    backgroundColor: '#001933',
    padding: 10,
    borderRadius: 5,
  },
  reactionsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContainerreactions: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContentreactions: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: "80%", // Restrict modal height
  },
  FlatListContainer: {
    maxHeight: "70%", // Limit the FlatList's height for scrolling
    width: '100%',
  },
  modalTitlereactions: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  reactionItem: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  reactionText: {
    fontSize: 16,
    color: '#fff', // Adjust text color for better contrast
  },
  reactionStatus: {
    fontSize: 14,
    color: '#fff',
  },
  closeButtonreactions: {
    marginTop: 20,
    backgroundColor: "#6c757d",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  buttonTextreactions: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalTextreactions: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
    fontWeight: 'bold',

  },
  roadInfoContainer: {
    flex: 1, // Prend toute la largeur disponible
    paddingRight: 10, // Évite que le texte ne chevauche le bouton Reactions
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  legendCircle: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 14,
    marginRight: 15,
  },
  reactionTel: {
    fontSize: 14,
    color: '#001933', // Blue color for tel
    textDecorationLine: 'underline', // Optional for visual cue
    marginBottom: 5,
  },


});

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, RefreshControl, Alert, Animated, Modal, TouchableOpacity, TextInput, Button } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import of icons
import AppURL from '@/components/src/URL';
import { useLocalSearchParams } from 'expo-router';
import { useUser } from '@/context/UserContext';



// Define types for User, Shift, Disponibility
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

type Shift = {
  _id: string;
  name: string;
  starttime: string;
  endtime: string;
  color: string;
};

type Disponibility = {
  _id: any;
  employeeId: string;
  selectedDay: string;
  shiftId: string;
  decisions?: 'accepted' | 'rejected';
  confirmation?: 'pending' | 'confirmed' | 'rejected' | 'canceled';
  presence?: string | null;
  suspension?: string;
  seen?: boolean;
};

// Utility function to get the start of the week (Sunday)
const getStartOfWeek = (date: Date) => {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
};

// Utility function to get the date range for the week (Sunday to Saturday)
const getWeekRange = (weekOffset = 0) => {
  const today = new Date();
  const startOfWeek = getStartOfWeek(new Date(today.setDate(today.getDate() + weekOffset * 7)));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return { startOfWeek, endOfWeek };
};


const AcceuilEmployee = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [acceptedDisponibilities, setAcceptedDisponibilities] = useState<Disponibility[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blinkAnimation = useRef(new Animated.Value(0)).current; // Persist the animation value
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false); // State for modal visibility
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null); // State for the selected shift
  const [selectedDispo, setSelectedDispo] = useState<Disponibility | null>(null); // State for the selected disponibilty
  // Function to start the blinking animation

  const startBlinkingAnimation = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blinkAnimation, {
          toValue: 1,
          duration: 500, // Duration of the blink
          useNativeDriver: true,
        }),
        Animated.timing(blinkAnimation, {
          toValue: 0,
          duration: 500, // Duration of the blink
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [blinkAnimation]);

  useEffect(() => {
    startBlinkingAnimation();
    fetchAcceptedDisponibilities(); // Fetch data
  }, [startBlinkingAnimation]);


  // Fetch accepted disponibilities and shifts with error handling
  const fetchAcceptedDisponibilities = async () => {
    try {
      setError(null);
      const dispoResponse = await axios.get(`${AppURL}/api/disponibilites/disponibilites?dsp_code=${user?.dsp_code}`);
      const userDispos = dispoResponse.data.filter(
        (dispo: Disponibility) => dispo.employeeId === user?._id && dispo.decisions === 'accepted'
      );

      const shiftsResponse = await axios.get(`${AppURL}/api/shifts/shifts?dsp_code=${user?.dsp_code}`);
      setShifts(shiftsResponse.data);
      setAcceptedDisponibilities(userDispos); // On récupère bien `seen`
    } catch (error) {
    }
  };


  useEffect(() => {
    fetchAcceptedDisponibilities();
    startBlinkingAnimation(); // Start the animation on page load
  }, [user]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAcceptedDisponibilities().finally(() => setRefreshing(false));
  }, []);

  // Find shift details by ID
  const getShiftDetails = (shiftId: string) => {
    return shifts.find((shift) => shift._id === shiftId) || null;
  };

  // Filter disponibilities by week
  const filterDisponibilitiesByWeek = (weekOffset: number) => {
    const { startOfWeek, endOfWeek } = getWeekRange(weekOffset);
    const normalizedStartOfWeek = new Date(startOfWeek.setHours(0, 0, 0, 0));
    const normalizedEndOfWeek = new Date(endOfWeek.setHours(23, 59, 59, 999));

    return acceptedDisponibilities.filter((dispo) => {
      const dispoDate = new Date(dispo.selectedDay);
      return dispoDate >= normalizedStartOfWeek && dispoDate <= normalizedEndOfWeek;
    });
  };

  const currentWeekDisponibilities = filterDisponibilitiesByWeek(0);
  const nextWeekDisponibilities = filterDisponibilitiesByWeek(1);

  // Show confirmation modal when a confirmed shift is clicked
  const handleShiftClick = async (shift: Shift, dispo: Disponibility) => {
    try {
      // ⚡️ Mise à jour de `seen` à `true`
      await axios.put(`${AppURL}/api/disponibilites/disponibilites/${dispo._id}/seen?dsp_code=${user?.dsp_code}`, {
        seen: true,
      });

      // 🚀 Recharger les données pour arrêter le clignotement
      fetchAcceptedDisponibilities();

      // ✅ Ouvrir le modal
      setSelectedShift(shift);
      setSelectedDispo(dispo);
      setConfirmationModalVisible(true);

    } catch (error) {
      console.error('Erreur lors de la mise à jour de seen:', error);
    }
  };


  const handleConfirmation = async (confirmed: boolean) => {
    if (selectedDispo) {
      try {
        // Update "presence" attribute with "confirmed" or "rejected"
        const response = await axios.put(`${AppURL}/api/disponibilites/disponibilites/${selectedDispo._id}/presence?dsp_code=${user?.dsp_code}`, {
          presence: confirmed ? 'confirmed' : 'rejected',
        });
        setConfirmationModalVisible(false);
        fetchAcceptedDisponibilities(); // Refresh data
      } catch (error) {
        console.error('Error updating confirmation:', error);
        Alert.alert('Error', 'Failed to update shift confirmation.');
      }
    }
  };

  /// Render icon based on "presence" attribute
  const renderPresenceIcon = (dispo: Disponibility) => {
    // 👁️ Si `seen` est false, on ne montre rien
    if (dispo.seen === false) {
      return null;
    }

    // ✅ Si `seen` est true, on affiche les icônes habituelles
    if (dispo.presence === 'confirmed') {
      return <Icon name="check" size={20} color="green" style={styles.presenceIcon} />;
    } else if (dispo.presence === 'rejected') {
      return <Icon name="times" size={20} color="red" style={styles.presenceIcon} />;
    }

  };


  return (
    <View style={styles.container}>

      <Text style={styles.subtitle}>
        {user?.language === 'English' ? 'Your Accepted Shifts' : 'Vos quarts acceptés'}
      </Text>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <Text style={styles.weekTitle}>
            {user?.language === 'English' ? 'Current Week' : 'Semaine en cours'}
          </Text>
          {currentWeekDisponibilities.length > 0 ? (
            currentWeekDisponibilities.map((dispo, index) => {
              const shift = getShiftDetails(dispo.shiftId);
              if (!shift) return null;

              // Apply blinking style if confirmation is "confirmed" and "presence" does not exist
              const blinkingStyle = dispo.seen === false
                ? {
                  opacity: blinkAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                }
                : {}; // Pas de clignotement si `seen` est true


              const textDecorationStyle = dispo.seen === true && dispo.confirmation === 'canceled'
                ? styles.strikeThroughText // Barrer seulement si `seen` est true
                : {};


              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => (
                    dispo.confirmation && // 🔥 Vérifie d'abord que confirmation existe
                    (
                      (dispo.confirmation !== 'canceled' && !dispo.presence) ||
                      (dispo.confirmation === 'canceled' && dispo.seen === false)
                    )
                  ) && handleShiftClick(shift, dispo)}

                >
                  <Animated.View
                    style={[styles.card, blinkingStyle, { backgroundColor: shift?.color || '#fff' }]} // Keep the background color
                  >
                    {/* Confirmation or rejection icon */}
                    {renderPresenceIcon(dispo)}

                    <View style={styles.shiftDetails}>

                      {dispo.suspension && (
                        <Text style={styles.suspensionIndicator}>
                          ⚠️ {user?.language === 'English' ? 'Sus' : 'Sus'}
                        </Text>
                      )}

                      <Text style={[styles.shiftName, textDecorationStyle]}>
                        {shift?.name}
                        {dispo.confirmation === 'canceled' && dispo.seen === true && <Text style={styles.canceledText}>({user?.language === 'English' ? 'Canceled' : 'Annulé'})</Text>}
                      </Text>
                      <Text style={[styles.shiftstarttime, textDecorationStyle]}>
                        {user?.language === 'English' ? 'Start Time' : 'Heure de début'}: {shift?.starttime}
                      </Text>
                      <Text style={[styles.shiftDate, textDecorationStyle]}>
                        {user?.language === 'English' ? 'Date' : 'Date'}: {new Date(dispo.selectedDay).toLocaleDateString()}
                      </Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              );

            })
          ) : (
            <Text style={styles.noShiftsText}>
              {user?.language === 'English'
                ? 'No accepted shifts for this week.'
                : 'Aucun quart accepté pour cette semaine.'}
            </Text>

          )}

          <Text style={styles.weekTitle}>
            {user?.language === 'English' ? 'Next Week' : 'Semaine prochaine'}
          </Text>
          {nextWeekDisponibilities.length > 0 ? (
            nextWeekDisponibilities.map((dispo, index) => {
              const shift = getShiftDetails(dispo.shiftId);
              if (!shift) return null;

              // Apply blinking style if confirmation is "confirmed" and "presence" does not exist
              const blinkingStyle = dispo.seen === false
                ? {
                  opacity: blinkAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0],
                  }),
                }
                : {}; // Pas de clignotement si `seen` est true


              const textDecorationStyle = dispo.seen === true && dispo.confirmation === 'canceled'
                ? styles.strikeThroughText // Barrer seulement si `seen` est true
                : {};

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => (
                    dispo.confirmation && // 🔥 Vérifie d'abord que confirmation existe
                    (
                      (dispo.confirmation !== 'canceled' && !dispo.presence) ||
                      (dispo.confirmation === 'canceled' && dispo.seen === false)
                    )
                  ) && handleShiftClick(shift, dispo)}

                >
                  <Animated.View
                    style={[styles.card, blinkingStyle, { backgroundColor: shift?.color || '#fff' }]} // Keep the background color
                  >
                    {/* Confirmation or rejection icon */}
                    {renderPresenceIcon(dispo)}

                    <View style={styles.shiftDetails}>

                      {dispo.suspension && (
                        <Text style={styles.suspensionIndicator}>
                          ⚠️ {user?.language === 'English' ? 'Sus' : 'Sus'}
                        </Text>
                      )}

                      <Text style={[styles.shiftName, textDecorationStyle]}>
                        {shift?.name}
                        {dispo.confirmation === 'canceled' && dispo.seen === true && <Text style={styles.canceledText}>({user?.language === 'English' ? 'Canceled' : 'Annulé'})</Text>}
                      </Text>
                      <Text style={[styles.shiftstarttime, textDecorationStyle]}>
                        {user?.language === 'English' ? 'Start Time' : 'Heure de début'}: {shift?.starttime}
                      </Text>
                      <Text style={[styles.shiftDate, textDecorationStyle]}>
                        {user?.language === 'English' ? 'Date' : 'Date'}: {new Date(dispo.selectedDay).toLocaleDateString()}
                      </Text>
                    </View>
                  </Animated.View>
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.noShiftsText}>
              {user?.language === 'English' ? 'No accepted shifts for next week.' : 'Aucun quart accepté pour la semaine prochaine.'}
            </Text>
          )}
        </ScrollView>
      )}

      {/* Modal for confirmation */}
      {selectedDispo && selectedShift && (
        <Modal visible={confirmationModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedDispo.confirmation === 'canceled' ? (
                <>
                  <Text style={styles.modalTitle}>
                    {user?.language === 'English' ? 'Shift Canceled' : 'Quart Annulé'}
                  </Text>
                  <Text style={styles.modalText}>
                    {user?.language === 'English'
                      ? `We are sorry, but your shift for ${selectedDispo.selectedDay} has been canceled due to conditions out of our control.`
                      : `Nous sommes désolés, mais votre quart pour le ${selectedDispo.selectedDay} a été annulé en raison de conditions indépendantes de notre volonté.`}
                  </Text>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setConfirmationModalVisible(false);
                      setSelectedDispo(null); // 🔥 Réinitialiser l'état
                      setSelectedShift(null); // 🔥 Réinitialiser l'état
                    }}
                  >
                    <Text style={styles.closeButtonText}>
                      {user?.language === 'English' ? 'Close' : 'Fermer'}
                    </Text>
                  </TouchableOpacity>

                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>
                    {user?.language === 'English' ? 'Confirm Your Presence' : 'Confirmer votre présence'}
                  </Text>
                  <Text style={styles.modalText}>
                    {user?.language === 'English' ? 'Shift' : 'Quart'}: {selectedShift.name}
                  </Text>
                  <Text style={styles.modalText}>
                    {user?.language === 'English' ? 'Date' : 'Date'}: {selectedDispo.selectedDay}
                  </Text>
                  <Text style={styles.modalText}>
                    {user?.language === 'English' ? 'Start Time' : 'Heure de début'}: {selectedShift.starttime}
                  </Text>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={() => handleConfirmation(true)}
                  >
                    <Text style={styles.confirmButtonText}>
                      {user?.language === 'English' ? 'Confirm' : 'Confirmer'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleConfirmation(false)}
                  >
                    <Text style={styles.rejectButtonText}>
                      {user?.language === 'English' ? 'Reject' : 'Rejeter'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setConfirmationModalVisible(false);
                      setSelectedDispo(null); // 🔥 Réinitialiser l'état
                      setSelectedShift(null); // 🔥 Réinitialiser l'état
                    }}
                  >
                    <Text style={styles.closeButtonText}>
                      {user?.language === 'English' ? 'Close' : 'Fermer'}
                    </Text>
                  </TouchableOpacity>

                </>
              )}
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
};

export default AcceuilEmployee;

const styles = StyleSheet.create({
  suspensionIndicator: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 5,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white', // Fond blanc
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
    marginBottom: 10,
    marginTop: 30,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#455A64', // Texte bleu-gris
    marginBottom: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 20,
    marginBottom: 8,
    backgroundColor: '#F5F5F5', // Fond gris clair
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shiftDetails: {
    marginLeft: 10,
  },
  shiftName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
    marginBottom: 5,
  },
  shiftstarttime: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333333',
    marginBottom: 5,
  },
  shiftendtime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 5,
  },
  shiftDate: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 5,
    fontWeight: 'bold',
  },
  noShiftsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
    marginTop: 20,
  },
  weekTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
    marginVertical: 8,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginVertical: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Overlay plus sombre
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff', // Fond blanc
    padding: 20,
    borderRadius: 15, // Coins arrondis
    width: '90%', // Largeur ajustée
    alignItems: 'center', // Centré horizontalement
    shadowColor: '#000', // Ombre pour profondeur
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10, // Ombre sur Android
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
    textAlign: 'center',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    color: '#455A64', // Texte gris-bleu
    textAlign: 'center',
    marginBottom: 20,
  },
  confirmButton: {
    backgroundColor: '#28A745', // Vert pour confirmer
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%', // Largeur ajustée
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rejectButton: {
    backgroundColor: '#DC3545', // Rouge pour rejeter
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%', // Largeur ajustée
    alignItems: 'center',
    marginBottom: 10,
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#6C757D', // Gris pour fermer
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '80%', // Largeur ajustée
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  presenceIcon: {
    marginRight: 10,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // "Canceled" aligné à droite
    alignItems: 'center', // Aligne verticalement les éléments
    marginBottom: 5, // Espacement entre les lignes
  },
  canceledText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC3545', // Rouge pour signaler l'annulation
    textAlign: 'right', // Alignement à droite
    marginLeft: 10, // Espacement entre le texte barré et "Canceled"
  },
  strikeThroughText: {
    textDecorationLine: 'line-through', // Texte barré
    color: '#333', // Couleur pour un effet estompé
  },


});

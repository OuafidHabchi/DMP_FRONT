import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, Pressable, Alert, ScrollView, RefreshControl } from 'react-native';
import { useRoute } from '@react-navigation/native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import AppURL from '@/components/src/URL';

// Define User type
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
  visible: boolean;
};

type Disponibility = {
  _id: string;
  userId: string;
  shiftId: string;
  selectedDay: string;
  decisions: string;
};

const Disponibilities = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [disponibilities, setDisponibilities] = useState<Disponibility[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [shiftModalVisible, setShiftModalVisible] = useState(false);
  const [existingDisponibility, setExistingDisponibility] = useState<Disponibility | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftName, setShiftName] = useState<string>('');

  // New state for month and year navigation
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const today = new Date();

  useEffect(() => {
    fetchData();
  }, [user._id]);

  const fetchData = async () => {
    try {
      const shiftResponse = await axios.get(`${AppURL}/api/shifts/shifts?dsp_code=${user.dsp_code}`);
      const visibleShifts = shiftResponse.data.filter((shift: Shift) => shift.visible); // Filtre pour visible === true
      setShifts(visibleShifts);

      const disponibilityResponse = await axios.get(`${AppURL}/api/disponibilites/disponibilites/employee/${user._id}?dsp_code=${user.dsp_code}`);
      setDisponibilities(disponibilityResponse.data);
    } catch (error) {
      Alert.alert(
        user.language === 'English' ? 'No Availability' : 'Aucune disponibilité',
        user.language === 'English'
          ? 'You need to choose at least one day to work.'
          : 'Vous devez choisir au moins un jour pour travailler.'
      );
    }
  };


  const onRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  // Function to get the current month and year
  const getCurrentMonth = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[currentMonth]} `;
  };

  // Function to get weeks of the selected month
  const getWeeksInMonth = () => {
    const year = currentYear;
    const month = currentMonth;
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay();

    if (firstDayOfWeek !== 0) {
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push(new Date(year, month, 1 - (firstDayOfWeek - i)));
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(year, month, i);
      currentWeek.push(currentDate);

      if (currentWeek.length === 7 || i === daysInMonth) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    return weeks;
  };

  // Function to navigate to the previous month
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Function to navigate to the next month
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const weeks = getWeeksInMonth();

  const isPastDate = (day: Date) => {
    return day.getTime() < today.getTime();
  };

  const isCurrentOrPreviousWeek = (week: Date[]) => {
    const todayStartOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const previousWeekStart = new Date(todayStartOfWeek);
    previousWeekStart.setDate(todayStartOfWeek.getDate() - 7);

    const startOfWeek = new Date(week[0]);
    return startOfWeek <= todayStartOfWeek && startOfWeek >= previousWeekStart;
  };

  const getDisponibilityForDay = (day: Date) => {
    const dayString = day.toDateString();
    return disponibilities.find((d) => d.selectedDay === dayString);
  };

  const handleSelectDay = (day: Date) => {
    const dispo = getDisponibilityForDay(day);

    setSelectedDay(day.toDateString());
    setSelectedDate(day.getDate());
    setExistingDisponibility(dispo || null);
    if (dispo && dispo.shiftId) {
      const selectedShift = shifts.find(shift => shift._id === dispo.shiftId);
      setShiftName(selectedShift ? selectedShift.name : 'Unknown Shift');
    }
    setShiftModalVisible(true);
  };

  const handleShiftSelect = async (shift: Shift) => {
    if (selectedDay && user._id && shift._id) {
      try {
        const data = {
          employeeId: user._id,
          shiftId: shift._id,
          selectedDay: selectedDay,
          expoPushToken: user.expoPushToken
        };

        if (existingDisponibility) {
          await axios.put(`${AppURL}/api/disponibilites/disponibilites/${existingDisponibility._id}?dsp_code=${user.dsp_code}`, data);
          Alert.alert(
            user.language === 'English' ? 'Success' : 'Succès',
            user.language === 'English'
              ? 'Disponibility updated successfully'
              : 'Disponibilité mise à jour avec succès'
          );
        } else {
          await axios.post(`${AppURL}/api/disponibilites/disponibilites/create?dsp_code=${user.dsp_code}`, data);
          Alert.alert(
            user.language === 'English' ? 'Success' : 'Succès',
            user.language === 'English'
              ? 'Disponibility saved successfully'
              : 'Disponibilité enregistrée avec succès'
          );
        }

        setShiftModalVisible(false);
        fetchData(); // Ajouter cet appel ici pour rafraîchir la liste

      } catch (error) {
        console.error('Error saving disponibilities:', error);
        Alert.alert(
          user.language === 'English' ? 'Error' : 'Erreur',
          user.language === 'English'
            ? 'Failed to save disponibility'
            : 'Échec de l\'enregistrement de la disponibilité'
        );
      }
    } else {
      Alert.alert(
        user.language === 'English' ? 'Error' : 'Erreur',
        user.language === 'English'
          ? 'Missing data to save disponibility'
          : 'Données manquantes pour enregistrer la disponibilité'
      );
    }
  };

  const handleDeleteDisponibility = async () => {
    if (existingDisponibility) {
      if (existingDisponibility.decisions === 'accepted' || existingDisponibility.decisions === 'rejected') {
        Alert.alert(
          user.language === 'English' ? 'Action Denied' : 'Action refusée',
          user.language === 'English'
            ? `You cannot delete a disponibility that has been ${existingDisponibility.decisions} by the manager.`
            : `Vous ne pouvez pas supprimer une disponibilité qui a été ${existingDisponibility.decisions} par le gestionnaire.`
        );
      } else {
        try {
          await axios.delete(`${AppURL}/api/disponibilites/disponibilites/${existingDisponibility._id}?dsp_code=${user.dsp_code}`);
          Alert.alert(
            user.language === 'English' ? 'Success' : 'Succès',
            user.language === 'English'
              ? 'Disponibility deleted successfully'
              : 'Disponibilité supprimée avec succès'
          );
          setShiftModalVisible(false);
          fetchData(); // Ajouter cet appel ici pour rafraîchir la liste
        } catch (error) {
          console.error('Error deleting disponibility:', error);
          Alert.alert(
            user.language === 'English' ? 'Error' : 'Erreur',
            user.language === 'English'
              ? 'Failed to delete disponibility'
              : 'Échec de la suppression de la disponibilité'
          );
        }
      }
    }
  };


  const getDayBackgroundColor = (day: Date) => {
    const dispo = getDisponibilityForDay(day);
    if (dispo) {
      const shift = shifts.find((shift) => shift._id === dispo.shiftId);
      return shift ? shift.color : '#33cc33'; // Utilise la couleur du shift si elle existe, sinon vert par défaut
    }
    if (day.toDateString() === new Date().toDateString()) {
      return '#FFA500'; // Couleur pour aujourd'hui
    }
    return '#ADD8E6'; // Couleur par défaut pour les jours sans dispo
  };


  return (
    <View style={styles.container}>
      {/* Pull to refresh */}
      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Month navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffff" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{getCurrentMonth()}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.iconButton}>
            <MaterialIcons name="arrow-forward" size={24} color="#ffff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>
          {user.language === 'English'
            ? `When You Want To Work ${user.name} ?`
            : `Quand voulez-vous travailler ${user.name} ?`}
        </Text>

        {/* Display weeks */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekContainer}>
            {week.map((day, dayIndex) => (
              <TouchableOpacity
                key={dayIndex}
                style={[
                  styles.dayContainer,
                  { backgroundColor: getDayBackgroundColor(day) },
                  isPastDate(day) || isCurrentOrPreviousWeek(week) || day.toDateString() === new Date().toDateString() ? styles.disabledDay : {}
                ]}
                onPress={() => !isPastDate(day) && !isCurrentOrPreviousWeek(week) && handleSelectDay(day)}
                disabled={isPastDate(day) || isCurrentOrPreviousWeek(week) || day.toDateString() === new Date().toDateString()}
              >
                <Text style={styles.dayText}>{day.getDate()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <Modal visible={shiftModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {user.language === 'English'
                ? (existingDisponibility
                  ? `Delete Disponibility for ${selectedDay}`
                  : `Select a Shift for ${selectedDay}`)
                : (existingDisponibility
                  ? `Supprimer la disponibilité pour ${selectedDay}`
                  : `Sélectionner un quart pour ${selectedDay}`)}
            </Text>
            {/* If a disponibility exists, show edit or delete options */}
            {existingDisponibility ? (
              <>
                <Text style={styles.label}>
                  {user.language === 'English'
                    ? `Current Shift: `
                    : `Quart actuel: `}
                  <Text>{shiftName}</Text>
                </Text>

                <Pressable style={styles.buttonShift} onPress={handleDeleteDisponibility}>
                  <Text style={styles.buttonText}>
                    {user.language === 'English'
                      ? 'Delete Disponibility'
                      : 'Supprimer la disponibilité'}
                  </Text>
                </Pressable>

              </>
            ) : (
              <>
                {shifts.length > 0 ? (
                  shifts.map((shift) => (
                    <Pressable
                      key={shift._id}
                      style={[styles.buttonShift, { backgroundColor: shift.color || '#33cc33' }]}
                      onPress={() => handleShiftSelect(shift)}
                    >
                      <Text style={styles.buttonText}>
                        {user.language === 'English'
                          ? shift.name
                          : shift.name}  {/* No translation needed for 'shift.name', assuming it's dynamic */}
                      </Text>

                      <Text style={styles.buttonText}>
                        {user.language === 'English'
                          ? `Start Time: ${shift.starttime} End Time: ${shift.endtime}`
                          : `Heure de début: ${shift.starttime} Heure de fin: ${shift.endtime}`}
                      </Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.noShiftText}>
                    {user.language === 'English' ? 'No shifts available' : 'Aucun quart disponible'}
                  </Text>
                )}
              </>
            )}

            <Pressable style={styles.buttonClose} onPress={() => setShiftModalVisible(false)}>
              <Text style={styles.buttonTextClose}>
                {user.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </Pressable>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

export default Disponibilities;

const styles = StyleSheet.create({
  iconButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#001933' // Bleu foncé pour les boutons icônes
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white', // Arrière-plan blanc
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navigationText: {
    fontSize: 24,
    color: '#333333', // Texte foncé pour contraste
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333333', // Texte foncé
    marginTop: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333333', // Texte foncé
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayContainer: {
    backgroundColor: '#F5F5F5', // Gris clair pour les jours
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 3,
  },
  disabledDay: {
    backgroundColor: '#E0E0E0', // Gris neutre pour les jours désactivés
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333', // Texte foncé pour contraste
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white', // Arrière-plan blanc
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333333', // Texte foncé
  },
  buttonShift: {
    backgroundColor: '#001933', // Bleu vif pour bouton de shift
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white', // Texte blanc pour contraste sur le bouton
    fontWeight: 'bold',
  },
  noShiftText: {
    color: '#333333', // Texte foncé pour contraste
    textAlign: 'center',
    marginBottom: 10,
  },
  buttonClose: {
    backgroundColor: '#B0BEC5', // Gris doux pour bouton de fermeture
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonTextClose: {
    color: '#333333', // Texte foncé
    fontWeight: 'bold',
  },
  label: {
    color: '#333333', // Texte foncé
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
});

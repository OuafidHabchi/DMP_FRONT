import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Pressable, Alert, ScrollView, RefreshControl, FlatList } from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';


const URL = 'https://coral-app-wqv9l.ondigitalocean.app/api/events';

type Event = {
  _id: string;
  title: string;
  duration: string;
  heur: string;
  date: string;
  Link: string;
  invitedGuests: string[];
  createdBy: string;
};

type Employee = {
  _id: string;
  name: string;
  familyName: string;
  role: string;
};

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

const Agenda = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [events, setEvents] = useState<Event[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({ title: '', heur: '', duration: '', Link: '', attendees: [] as string[] });
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentImminentEvent, setCurrentImminentEvent] = useState<Event | null>(null);

  const today = new Date();

  useEffect(() => {
    fetchEvents();
    fetchEmployees();
  }, [currentMonth, currentYear]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${URL}?dsp_code=${user.dsp_code}`, { params: { month: currentMonth + 1, year: currentYear } });
      setEvents(response.data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer les événements');
    }
  };

  useEffect(() => {
    const checkTodaysEvents = () => {
      const currentDate = new Date().toISOString().split('T')[0]; // Date actuelle au format "YYYY-MM-DD"

      const todaysEvent = events.find((event) => {
        // Vérifier si c'est aujourd'hui
        if (event.date !== currentDate) {
          return false;
        }

        // Vérifier si l'utilisateur est invité ou est le créateur
        const isInvited = event.invitedGuests.includes(user._id);
        const isCreator = event.createdBy === user._id;

        return isInvited || isCreator;
      });

      setCurrentImminentEvent(todaysEvent || null); // Mettre à jour l'état
    };

    checkTodaysEvents();
  }, [events, user._id]); // Recalculer chaque fois que `events` ou `user._id` change



  const fetchEmployees = async () => {
    try {
      const response = await axios.get(`https://coral-app-wqv9l.ondigitalocean.app/api/employee?dsp_code=${user.dsp_code}`);
      const nonDriverEmployees = response.data.filter((employee: Employee) => employee.role !== 'driver');
      setEmployees(nonDriverEmployees);
      setFilteredEmployees(nonDriverEmployees);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer les employés');
    }
  };


  const onRefresh = () => {
    fetchEvents();
  };

  const getCurrentMonth = () => {
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return `${monthNames[currentMonth]} ${currentYear}`;
  };

  const getWeeksInMonth = () => {
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];
    const firstDay = new Date(currentYear, currentMonth, 1);
    const firstDayOfWeek = firstDay.getDay();
    if (firstDayOfWeek !== 0) {
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push(new Date(currentYear, currentMonth, 1 - (firstDayOfWeek - i)));
      }
    }

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDate = new Date(currentYear, currentMonth, i);
      currentWeek.push(currentDate);
      if (currentWeek.length === 7 || i === daysInMonth) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    return weeks;
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSelectDay = (day: Date) => {
    const event = events.find((e) => e.date === day.toISOString().split('T')[0]);

    if (event) {
      if (event.invitedGuests.includes(user._id) || event.createdBy === user._id) {
        // L'utilisateur peut voir les détails de l'événement
        setSelectedDate(day);
        setCurrentEvent(event);
        setEventModalVisible(true);
      } else {
        Alert.alert(
          user.language === 'English' ? 'Access Denied' : 'Accès refusé',
          user.language === 'English' ? 'You cannot view the details of this event' : 'Vous ne pouvez pas voir les détails de cet événement'
        );
        window.alert(
          user.language === 'English' ? 'You cannot view the details of this event' : 'Vous ne pouvez pas voir les détails de cet événement'
        );

      }
    } else {
      // Pas d'événement pour ce jour, on ouvre le modal pour en créer un nouveau
      setSelectedDate(day);
      setCurrentEvent(null); // Prépare pour la création
      setEventModalVisible(true); // Affiche le modal pour créer un événement
    }
  };

  const resetModalFields = () => {
    setNewEvent({ title: '', heur: '', duration: '', Link: '', attendees: [] });
  };
  


  const handleAddOrUpdateEvent = async () => {
    try {
      const eventData = currentEvent
        ? currentEvent
        : {
          title: newEvent.title,
          duration: newEvent.duration,
          date: selectedDate?.toISOString().split('T')[0],
          heur: newEvent.heur || '00:00',
          Link: newEvent.Link, // Utilisation de Link avec une majuscule
          invitedGuests: newEvent.attendees,
          createdBy: user._id,
          dsp_code:user.dsp_code,
        };

      // Validation locale pour les champs requis
      if (!eventData.title || !eventData.date || !eventData.heur || !eventData.createdBy || !eventData.duration || !eventData.Link) {
        Alert.alert(
          user.language === 'English' ? 'Error' : 'Erreur',
          user.language === 'English' ? 'The fields title, date, time, Link are required.' : 'Les champs title, date, heure, Link sont requis.'
        );
        window.alert(
          user.language === 'English' ? 'The fields title, date, time, Link are required.' : 'Les champs title, date, heure, Link sont requis.'
        );

        return;
      }

      if (currentEvent) {
        if (user._id === currentEvent.createdBy) {
          await axios.put(`${URL}/${currentEvent._id}?dsp_code=${user.dsp_code}`, eventData);
          Alert.alert(
            user.language === 'English' ? 'Success' : 'Succès',
            user.language === 'English' ? 'Event updated' : 'Événement mis à jour'
          );
          window.alert(
            user.language === 'English' ? 'Event updated' : 'Événement mis à jour'
          );
        } else {
          Alert.alert(
            user.language === 'English' ? 'Access Denied' : 'Accès refusé',
            user.language === 'English' ? 'You can only view the details of this event.' : 'Vous ne pouvez que visualiser les détails de cet événement.'
          );
          window.alert(
            user.language === 'English' ? 'You can only view the details of this event.' : 'Vous ne pouvez que visualiser les détails de cet événement.'
          );
          return;
        }
      } else {
        await axios.post(`${URL}`, eventData);
        Alert.alert(
          user.language === 'English' ? 'Success' : 'Succès',
          user.language === 'English' ? 'Event created' : 'Événement créé'
        );
        window.alert(
          user.language === 'English' ? 'Event created' : 'Événement créé'
        );
        resetModalFields(); // Réinitialiser les champs après création
      }


      fetchEvents();
      setEventModalVisible(false);
    } catch (error: any) {
      console.error("Erreur lors de l'envoi des données:", error.response ? error.response.data : error.message);
      Alert.alert('Erreur', error.response?.data.message || "Échec de la sauvegarde de l'événement");
      window.alert(error.response?.data.message || "Échec de la sauvegarde de l'événement");
    }
  };


  const handleDeleteEvent = async () => {
    if (currentEvent && user._id === currentEvent.createdBy) {
      try {
        await axios.delete(`${URL}/${currentEvent._id}?dsp_code=${user.dsp_code}`);
        Alert.alert('Succès', 'Événement supprimé');
        fetchEvents();
        setEventModalVisible(false);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
        window.alert('Impossible de supprimer l\'événement');

      }
    } else {
      Alert.alert('Erreur', 'Seul le créateur peut supprimer cet événement');
      window.alert('Seul le créateur peut supprimer cet événement');

    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    const filtered = employees.filter((emp) => emp.name.toLowerCase().includes(text.toLowerCase()) || emp.familyName.toLowerCase().includes(text.toLowerCase()));
    setFilteredEmployees(filtered);
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    const attendees = currentEvent ? [...currentEvent.invitedGuests] : [...newEvent.attendees];
    const index = attendees.indexOf(employeeId);

    if (index > -1) {
      attendees.splice(index, 1);
    } else {
      attendees.push(employeeId);
    }

    if (currentEvent) {
      setCurrentEvent({ ...currentEvent, invitedGuests: attendees });
    } else {
      setNewEvent({ ...newEvent, attendees });
    }
  };

  const weeks = getWeeksInMonth();

  return (
    <View style={styles.container}>
      {currentImminentEvent && (
        <View style={styles.notification}>
          <Text style={styles.notificationText}>
            🔔 {user.language === 'English' ? 'Event today' : 'Événement aujourd\'hui'} : {currentImminentEvent.title}, {user.language === 'English' ? 'At' : 'À'} : {currentImminentEvent.heur}
          </Text>

        </View>
      )}

      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}>
        <View style={styles.navigationContainer}>
          <TouchableOpacity onPress={handlePreviousMonth} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={24} color="#ffff" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{getCurrentMonth()}</Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.iconButton}>
            <MaterialIcons name="arrow-forward" size={24} color="#ffff" />
          </TouchableOpacity>
        </View>

        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekContainer}>
            {week.map((day, dayIndex) => {
              const isToday = day.toDateString() === today.toDateString();
              const event = events.find((e) => e.date === day.toISOString().split('T')[0]);
              const canViewEvent = event && (event.invitedGuests.includes(user._id) || event.createdBy === user._id);
              const hasEvent = Boolean(event);

              return (
                <TouchableOpacity
                  key={dayIndex}
                  style={[
                    styles.dayContainer,
                    {
                      backgroundColor: isToday
                        ? '#28a745'
                        : canViewEvent
                          ? '#FFA726'
                          : hasEvent
                            ? '#E0E0E0'
                            : '#E3F2FD',
                    },
                  ]}
                  onPress={() => handleSelectDay(day)}
                >
                  <Text style={[styles.dayText, { color: isToday ? '#FFFFFF' : '#333' }]}>{day.getDate()}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <Modal visible={eventModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>
              {user.language === 'English' ? (currentEvent ? 'Edit Event' : 'Create Event') : (currentEvent ? 'Modifier l\'événement' : 'Créer un événement')}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Event Name' : 'Nom de l\'événement'}
              value={currentEvent ? currentEvent.title : newEvent.title}
              onChangeText={(text) => currentEvent ? setCurrentEvent({ ...currentEvent, title: text }) : setNewEvent({ ...newEvent, title: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Time' : 'Heure'}
              value={currentEvent ? currentEvent.heur : newEvent.heur}
              onChangeText={(text) => currentEvent ? setCurrentEvent({ ...currentEvent, heur: text }) : setNewEvent({ ...newEvent, heur: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Duration' : 'Durée'}
              value={currentEvent ? currentEvent.duration : newEvent.duration}
              onChangeText={(text) => currentEvent ? setCurrentEvent({ ...currentEvent, duration: text }) : setNewEvent({ ...newEvent, duration: text })}
            />
            <TextInput
              style={styles.input}
              placeholder={user.language === 'English' ? 'Link' : 'Link'}
              value={currentEvent ? currentEvent.Link : newEvent.Link}
              onChangeText={(text) => currentEvent ? setCurrentEvent({ ...currentEvent, Link: text }) : setNewEvent({ ...newEvent, Link: text })}
            />
            <TextInput
              style={styles.searchBar}
              placeholder={user.language === 'English' ? 'Search an employee' : 'Rechercher un employé'}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <FlatList
              data={filteredEmployees}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.employeeItem, (currentEvent?.invitedGuests.includes(item._id) || newEvent.attendees.includes(item._id)) ? styles.selectedEmployee : null]}
                  onPress={() => toggleEmployeeSelection(item._id)}
                >
                  <Text>{item.name} {item.familyName}</Text>
                </TouchableOpacity>
              )}
            />

            <Pressable style={styles.buttonSave} onPress={handleAddOrUpdateEvent}>
              <Text style={styles.buttonText}>
                {user.language === 'English' ? (currentEvent ? 'Update' : 'Create') : (currentEvent ? 'Mettre à jour' : 'Créer')}
              </Text>
            </Pressable>
            {currentEvent && (
              <Pressable style={styles.buttonDelete} onPress={handleDeleteEvent}>
                <Text style={styles.buttonText}>{user.language === 'English' ? 'Delete' : 'Supprimer'}</Text>
              </Pressable>
            )}
            <Pressable style={styles.buttonClose} onPress={() => setEventModalVisible(false)}>
              <Text style={styles.buttonTextClose}>{user.language === 'English' ? 'Close' : 'Fermer'}</Text>
            </Pressable>
          </View>
        </Modal>


      </ScrollView>
    </View>
  );
};

export default Agenda;

// Styles
const styles = StyleSheet.create({
  iconButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: '#001933' // Bleu foncé pour les boutons icônes
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f0f4f7',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navigationText: {
    fontSize: 24,
    color: '#0277BD',
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  dayText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#001933',
  },
  input: {
    height: 40,
    borderColor: '#0277BD',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  searchBar: {
    height: 40,
    borderColor: '#0277BD',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  employeeItem: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    backgroundColor: '#f9f9f9',
  },
  selectedEmployee: {
    backgroundColor: '#AED581',
  },
  buttonSave: {
    backgroundColor: '#001933',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDelete: {
    backgroundColor: '#E53935',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonClose: {
    backgroundColor: '#cccccc',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  buttonTextClose: {
    color: '#333',
    fontWeight: 'bold',
  },
  notification: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: '#FFEB3B',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  notificationText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
});

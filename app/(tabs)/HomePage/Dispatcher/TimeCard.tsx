import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, ScrollView, TextInput, FlatList, Platform, Pressable, Modal, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useRoute } from '@react-navigation/native';
import AppURL from '@/components/src/URL';
AppURL


const URL_TimeCard = `${AppURL}/api/timecards`;
const URL_Comment = `${AppURL}/api`;

type Employee = {
  _id: string;
  name: string;
  familyName: string;
};

type Shift = {
  _id: string;
  name: string;
  starttime: string;
  endtime: string;
  color: string;
};

type Disponibility = {
  _id: string;
  employeeId: string;
  shiftId: string;
  selectedDay: string;
  confirmation: 'confirmed' | 'canceled';
  presence?: 'confirmed' | 'rejected';
};

type TimeCardData = {
  _id: string;
  employeeId: string;
  day: string;
  startTime: string | null;
  endTime: string | null;
  lastDelivery: string | null;
  tel?: string;          // TEL field for each time card
  powerbank?: string;    // PowerBank field for each time card
};

type Vehicle = {
  data: Vehicle;
  _id: string;
  vehicleNumber: string;
  model: string;
};

type VanAssignment = {
  employeeId: string;
  vanId: string;
  date: string;
};

type Phone = {
  _id: string;         // ID unique de l'objet dans MongoDB
  name: string;        // Nom du téléphone
  number: string;      // Numéro associé au téléphone
  supplier: string;    // Fournisseur du téléphone
  model: string;       // Modèle du téléphone
  functional: boolean; // Indique si le téléphone est fonctionnel
};

type PowerBank = {
  _id: string;         // ID unique de l'objet dans MongoDB
  name: string;        // Nom du powerbank
  functional: boolean; // Indique si le powerbank est fonctionnel
};

interface Comment {
  _id: string;
  text: string;
}

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



// Fonction pour formater l'heure actuelle en HH:MM
const getCurrentTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');  // Format "00"
  const minutes = String(now.getMinutes()).padStart(2, '0');  // Format "00"
  return `${hours}:${minutes}`;
};

const TimeCard: React.FC = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };

  const [timeCards, setTimeCards] = useState<TimeCardData[]>([]);
  const [employees, setEmployees] = useState<Record<string, Employee>>({});
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [vans, setVans] = useState<Record<string, Vehicle>>({});
  const [vanAssignments, setVanAssignments] = useState<VanAssignment[]>([]);
  const [disponibilities, setDisponibilities] = useState<Record<string, Disponibility>>({});
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState<boolean>(true);
  const [manualStartTimes, setManualStartTimes] = useState<Record<string, string>>({});
  const [manualEndTimes, setManualEndTimes] = useState<Record<string, string>>({});
  const [telValues, setTelValues] = useState<Record<string, string>>({});
  const [powerBankValues, setPowerBankValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState<string>(''); // Nouvel état pour la recherche
  const [functionalPhones, setFunctionalPhones] = useState<Phone[]>([]);
  const [functionalPowerBanks, setFunctionalPowerBanks] = useState<PowerBank[]>([]);
  const [comments, setComments] = useState<Record<string, Comment>>({});
  const [isCommentModalVisible, setIsCommentModalVisible] = useState<boolean>(false); // Modal de commentaire
  const [currentCommentEmployeeId, setCurrentCommentEmployeeId] = useState<string | null>(null); // ID de l'employé pour le modal
  const [currentCommentText, setCurrentCommentText] = useState<string>(''); // Texte de commentaire en cours
  const [manualLastDeliveryTimes, setManualLastDeliveryTimes] = useState<Record<string, string>>({});
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // État pour gérer le pull-to-refresh


  useEffect(() => {
    if (timeCards.length > 0) {
      initializeTelAndPowerBankValues(timeCards);
    }
  }, [timeCards, functionalPhones, functionalPowerBanks]);
  

  const onRefresh = async () => {
    setRefreshing(true); // Active l'indicateur
    try {
      await fetchData(); // Recharger les données
    } catch (error) {
      console.error("Error during refresh:", error);
    } finally {
      setRefreshing(false); // Désactive l'indicateur
    }
  };
  


  const generateAndDownloadPDF = async () => {
    const formattedDate = formatDate(date);

    // Prepare the data
    const data = {
      timeCards: timeCards.map((card) => ({
        ...card,
        tel: functionalPhones.find((phone) => phone._id === card.tel)?.name || 'N/A',
        powerbank: functionalPowerBanks.find((pb) => pb._id === card.powerbank)?.name || 'N/A',
        comment: comments[`${card.employeeId}_${card.day}`]?.text || 'No comment', // Map comment for each employee
      })),
      employees,
      date: formattedDate,
      userName: `${user.name} ${user.familyName}`,
    };

    try {
      const response = await fetch(`${AppURL}/api/download/timecard-pdf?dsp_code=${user.dsp_code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      if (Platform.OS === 'web') {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TimeCard_${formattedDate}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        const blob = await response.blob();
        const filePath = `${FileSystem.documentDirectory}TimeCard_${formattedDate}.pdf`;

        const reader = new FileReader();
        reader.onloadend = async () => {
          if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            if (base64) {
              await FileSystem.writeAsStringAsync(filePath, base64, {
                encoding: FileSystem.EncodingType.Base64,
              });
              await Sharing.shareAsync(filePath);
            }
          } else {
            throw new Error('Failed to process the file as a string.');
          }
        };

        reader.onerror = () => {
          Alert.alert('Error', 'Failed to process the file for download.');
          console.error('Error reading blob with FileReader.');
        };

        reader.readAsDataURL(blob);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF.');
      console.error('PDF Generation Error:', error);
    }
  };


  // Fonction pour ouvrir le modal
  const openCommentModal = (employeeId: string) => {
    const currentDay = formatDate(date);
    const key = `${employeeId}_${currentDay}`;
    // Charge le commentaire s'il existe, sinon ouvre un modal vide
    if (comments[key]) {
      setCurrentCommentText(comments[key].text); // Charger le texte du commentaire existant
    } else {
      setCurrentCommentText(''); // Aucun commentaire, on démarre avec un texte vide
    }

    setCurrentCommentEmployeeId(employeeId); // Enregistrer l'employé actuel
    setIsCommentModalVisible(true); // Afficher le modal
  };

  // Fonction pour sauvegarder le commentaire
  // Fonction pour sauvegarder le commentaire
  const saveComment = async () => {
    if (currentCommentEmployeeId) {
      const currentDay = formatDate(date); // Date actuelle
      const key = `${currentCommentEmployeeId}_${currentDay}`;
      const existingComment = comments[key]; // Vérifier si un commentaire existe déjà

      try {
        const data = {
          idEmploye: currentCommentEmployeeId,
          date: currentDay,
          comment: currentCommentText,
        };

        let response;

        if (existingComment) {
          // Si un commentaire existe, on le met à jour
          response = await axios.put(`${URL_Comment}/comments/${existingComment._id}?dsp_code=${user.dsp_code}`, data);

          // Mettre à jour localement après succès
          setComments((prev) => ({
            ...prev,
            [key]: {
              _id: existingComment._id, // Conserver l'ID existant
              text: currentCommentText, // Mettre à jour le texte
            },
          }));
        } else {
          // Si aucun commentaire n'existe, on le crée
          response = await axios.post(`${URL_Comment}/comments/create?dsp_code=${user.dsp_code}`, data);

          const createdComment = response.data; // Suppose que l'API retourne le commentaire créé avec `_id` et `text`

          // Ajouter le nouveau commentaire localement après succès
          setComments((prev) => ({
            ...prev,
            [key]: {
              _id: createdComment._id,
              text: createdComment.comment,
            },
          }));

        }
        // Rafraîchir la liste des commentaires
        await fetchCommentsByDate();
      } catch (error) {
        Alert.alert('Erreur', "Impossible de sauvegarder le commentaire.");
      }

      setIsCommentModalVisible(false); // Fermer le modal
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await axios.delete(`${URL_Comment}/comments/${commentId}?dsp_code=${user.dsp_code}`);
      setComments((prev) => {
        const updatedComments = { ...prev };
        const keyToDelete = Object.keys(prev).find((key) => prev[key]._id === commentId);
        if (keyToDelete) delete updatedComments[keyToDelete];
        return updatedComments;
      });
    } catch (error) {
    }
    setIsCommentModalVisible(false);
  };

  const formatDate = (date: Date): string => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthsOfYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${daysOfWeek[date.getDay()]} ${monthsOfYear[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')} ${date.getFullYear()}`;
  };


  const fetchFunctionalDevices = async () => {
    try {
      const phonesRes = await axios.get<Phone[]>(`${AppURL}/api/phones/phones/functional/all?dsp_code=${user.dsp_code}`);
      const powerBanksRes = await axios.get<PowerBank[]>(`${AppURL}/api/powerbanks/powerbanks/functional/all?dsp_code=${user.dsp_code}`);

      setFunctionalPhones(phonesRes.data);
      setFunctionalPowerBanks(powerBanksRes.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des téléphones ou powerbanks fonctionnels :', error);
    }
  };
  const getAvailablePhones = (employeeId: string) => {
    // Récupérer tous les téléphones déjà utilisés, sauf pour l'employé actuel
    const usedPhones = Object.entries(telValues)
      .filter(([key, value]) => key !== employeeId) // Exclure l'employé actuel
      .map(([key, value]) => value);

    // Retourner les téléphones fonctionnels qui ne sont pas encore utilisés
    return functionalPhones.filter((phone) => !usedPhones.includes(phone._id));
  };

  const getAvailablePowerBanks = (employeeId: string) => {
    const usedPowerBanks = Object.entries(powerBankValues)
      .filter(([key, value]) => key !== employeeId)
      .map(([key, value]) => value);

    return functionalPowerBanks.filter((powerBank) => !usedPowerBanks.includes(powerBank._id));
  };


  const initializeTelAndPowerBankValues = (timeCards: TimeCardData[]) => {
    const initialTelValues: Record<string, string> = {};
    const initialPowerBankValues: Record<string, string> = {};

    timeCards.forEach((timeCard) => {
      // Trouver le téléphone correspondant à l'ID
      const matchedPhone = functionalPhones.find((phone) => phone._id === timeCard.tel);
      const matchedPowerBank = functionalPowerBanks.find((powerBank) => powerBank._id === timeCard.powerbank);

      // Assigner le nom ou laisser vide si non trouvé
      initialTelValues[timeCard.employeeId] = matchedPhone ? matchedPhone._id : '';
      initialPowerBankValues[timeCard.employeeId] = matchedPowerBank ? matchedPowerBank._id : '';
    });

    setTelValues(initialTelValues);
    setPowerBankValues(initialPowerBankValues);
  };




  const fetchData = async () => {
    // Réinitialiser les états
    setTimeCards([]);
    setEmployees({});
    setShifts({});
    setVans({});
    setVanAssignments([]);
    setDisponibilities({});
    setLoading(true);

    const formattedDate = formatDate(date);

    try {
      // 1. Récupérer les `VanAssignments` pour le jour donné
      const vanAssignmentRes = await axios.get<VanAssignment[]>(`${AppURL}/api/vanAssignments/date/${encodeURIComponent(formattedDate)}?dsp_code=${user.dsp_code}`);
      const vanAssignments = vanAssignmentRes.data;
      setVanAssignments(vanAssignments);

      // 2. Extraire les IDs des employés et vans des `VanAssignments`
      const employeeIds = [...new Set(vanAssignments.map(assignment => assignment.employeeId))];
      const vanIds = [...new Set(vanAssignments.map(assignment => assignment.vanId))];

      // 3. Récupérer les informations des employés par leurs IDs
      const employeeRes = await axios.post<Employee[]>(
        `${AppURL}/api/employee/by-ids`,
        { ids: employeeIds }, // Keep the payload as it is
        {
          params: { dsp_code: user.dsp_code }, // Add dsp_code as a query parameter
        }
      );
            const employeeMap = employeeRes.data.reduce((map, employee) => {
        map[employee._id] = employee;
        return map;
      }, {} as Record<string, Employee>);
      setEmployees(employeeMap);

      // 4. Récupérer la `Disponibility` pour chaque employé et le jour donné
      const dispoMap: Record<string, Disponibility> = {};
      for (const employeeId of employeeIds) {
        try {
          const dispoRes = await axios.get<Disponibility[]>(`${AppURL}/api/disponibilites/disponibilites/employee/${employeeId}/day/${encodeURIComponent(formattedDate)}?dsp_code=${user.dsp_code}`);
          dispoRes.data.forEach((dispo: Disponibility) => {
            dispoMap[dispo.employeeId] = dispo;
          });
        } catch (error) {
          console.error(`Erreur lors de la récupération de la disponibilité pour l'employé ${employeeId}:`, error);
        }
      }
      setDisponibilities(dispoMap);

      // 5. Récupérer les informations de `Shift` à partir des IDs de `Shift` présents dans les disponibilités
      const shiftIds = [...new Set(Object.values(dispoMap).map(dispo => dispo.shiftId))];
      const shiftMap: Record<string, Shift> = {};
      for (const shiftId of shiftIds) {
        try {
          const shiftRes = await axios.get<Shift>(`${AppURL}/api/shifts/shifts/${shiftId}?dsp_code=${user.dsp_code}`);
          shiftMap[shiftRes.data._id] = shiftRes.data;
        } catch (error) {
          console.error(`Erreur lors de la récupération du shift avec l'ID ${shiftId}:`, error);
        }
      }
      setShifts(shiftMap);

      // 6. Récupérer les informations des véhicules à partir des IDs de vans
      const vanMap: Record<string, Vehicle> = {};
      for (const vanId of vanIds) {
        if (vanId) {
          try {
            const vehicleRes = await axios.get<Vehicle>(`${AppURL}/api/vehicles/${vanId}?dsp_code=${user.dsp_code}`);
            if (vehicleRes.data && vehicleRes.data.data) {
              vanMap[vehicleRes.data.data._id] = vehicleRes.data.data;
            }
          } catch (error) {
            console.error(`Erreur lors de la récupération des détails du véhicule pour le vanID ${vanId}:`, error);
          }
        }
      }
      setVans(vanMap);

      // 7. Récupérer et organiser les `TimeCards` par jour, puis les aplatir      
      try {
        const timeCardRes = await axios.get<TimeCardData[]>(`${URL_TimeCard}/timecardsss/dday/${encodeURIComponent(formattedDate)}`, {
          params: {
            dsp_code: user.dsp_code,
          },
        });
        
        // Grouper les timeCards par jour
        const groupedByDay = timeCardRes.data.reduce((acc, timeCard) => {
          const day = timeCard.day;
          if (!acc[day]) acc[day] = [];
          acc[day].push(timeCard);
          return acc;
        }, {} as Record<string, TimeCardData[]>);

        const initialLastDeliveryTimes: Record<string, string> = {};
        timeCardRes.data.forEach(tc => {
          initialLastDeliveryTimes[tc.employeeId] = tc.lastDelivery || '';
        });
        setManualLastDeliveryTimes(initialLastDeliveryTimes);

        // Aplatir les données groupées pour obtenir un tableau unique
        const flattenedTimeCards = Object.values(groupedByDay).flat();
        setTimeCards(flattenedTimeCards);
        initializeTelAndPowerBankValues(flattenedTimeCards);

      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          console.log("Aucune time card trouvée pour cette journée.");
        } else {
          console.error("Erreur lors de la récupération des time cards:", error);
          Alert.alert("Erreur", "Échec de la récupération des time cards pour le jour sélectionné.");
        }
      }

    } catch (error) {
      // console.error("Erreur générale lors de la récupération des données:", error);
      // Alert.alert("Erreur", "Échec de la récupération des données pour le jour sélectionné.");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer les commentaires par employé et date
  const fetchCommentsByDate = async () => {
    try {
      const formattedDate = formatDate(date); // Date actuelle formatée
      const response = await axios.get(`${URL_Comment}/comments/date/${encodeURIComponent(formattedDate)}?dsp_code=${user.dsp_code}`);
      const commentsData = response.data;

      // Convertir les commentaires en un objet clé-valeur pour un accès rapide
      const commentsMap = commentsData.reduce((acc: Record<string, Comment>, comment: any) => {
        acc[`${comment.idEmploye}_${comment.date}`] = { _id: comment._id, text: comment.comment };
        return acc;
      }, {});

      setComments(commentsMap); // Mettre à jour l'état local des commentaires
    } catch (error) {
      // Si l'erreur est 404, ne pas afficher le message dans la console
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Pas de commentaires pour cette date : pas d'action nécessaire
        setComments({}); // Réinitialiser les commentaires à un objet vide
      } else {
        // Gérer les autres erreurs
      }
    }
  };





  useEffect(() => {
    // Réinitialise les valeurs à chaque changement de date
    setTimeCards([]);
    setEmployees({});
    setShifts({});
    setVans({});
    setVanAssignments([]);
    setDisponibilities({});
    setManualStartTimes({});
    setManualEndTimes({});
    setTelValues({});
    setPowerBankValues({});
    fetchFunctionalDevices();
    fetchCommentsByDate(); // Charger les commentaires pour la date actuelle
    fetchData();
  }, [date]); // Utilise `date` comme dépendance pour mettre à jour à chaque changement de jour


  const handleDayChange = (direction: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + direction);
    setDate(newDate);
  };

  const formatTimeWithoutSeconds = (time: string | null): string => {
    return time ? time.slice(0, 5) : ''; // Conserve seulement les 5 premiers caractères (HH:MM)
  };

  const updateTimeCard = (id: string, field: 'startTime' | 'endTime', value: string) => {
    setTimeCards(prevTimeCards =>
      prevTimeCards.map(card =>
        card._id === id ? { ...card, [field]: value } : card
      )
    );
  };



  // Add the mergeData function
  const mergeData = () => {
    const mergedData = vanAssignments.map((assignment) => {
      // Find if a TimeCard exists for this employee for the day
      const timeCard = timeCards.find((tc) => tc.employeeId === assignment.employeeId);
      return timeCard || assignment; // If TimeCard exists, use it; otherwise, use VanAssignment
    });
    return mergedData.sort((a, b) => {
      const shiftA = shifts[disponibilities[a.employeeId]?.shiftId]?.name || '';
      const shiftB = shifts[disponibilities[b.employeeId]?.shiftId]?.name || '';
      return shiftA.localeCompare(shiftB); // Sort alphabetically by shift name
    });
  };

  // Filtre pour la barre de recherche
  const filteredData = mergeData().filter((item) => {
    const employee = employees[item.employeeId];
    const fullName = employee ? `${employee.name} ${employee.familyName}` : '';
    return fullName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleTelChange = (employeeId: string, value: string) => {
    setTelValues(prev => ({
      ...prev,
      [employeeId]: value,
    }));
  };

  const handlePowerBankChange = (employeeId: string, value: string) => {
    setPowerBankValues(prev => ({
      ...prev,
      [employeeId]: value,
    }));
  };


  const handleUpdate = async (employeeId: string, day: string) => {
    if (!day) {
      day = formatDate(new Date()); // Use the current date if day is not provided
    }
  
    const existingTimeCard = timeCards.find(tc => tc.employeeId === employeeId && tc.day === day) || {} as TimeCardData;
  
    const updatedData: Partial<TimeCardData> = {};
  
    // Utilitaire pour comparer et mettre à jour
    const updateField = (field: keyof TimeCardData, newValue: any, existingValue: any) => {
      if (newValue !== existingValue) {
        updatedData[field] = newValue || existingValue;
      }
    };
  
    // Vérifications des champs modifiés
    updateField("tel", telValues[employeeId], existingTimeCard.tel);
    updateField("powerbank", powerBankValues[employeeId], existingTimeCard.powerbank);
    updateField("startTime", manualStartTimes[employeeId], existingTimeCard.startTime);
    updateField("endTime", manualEndTimes[employeeId], existingTimeCard.endTime);
    updateField("lastDelivery", manualLastDeliveryTimes[employeeId], existingTimeCard.lastDelivery);
  
    if (Object.keys(updatedData).length === 0) {
      console.log("No modifications detected for this employee.");
      return;
    }
  
    const data = {
      employeeId,
      day,
      ...updatedData,
    };
  
    try {
      await axios.put(`${URL_TimeCard}/timecards/${employeeId}/${encodeURIComponent(day)}?dsp_code=${user.dsp_code}`, data);
      Alert.alert("Success", "Time card updated successfully.");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.info("Time card not found. Creating a new record...");
        try {
          await axios.post(`${URL_TimeCard}/timecards?dsp_code=${user.dsp_code}`, data);
          Alert.alert("Success", "Time card created successfully.");
        } catch (createError) {
          console.error("Error creating time card:", createError);
          Alert.alert("Error", "Failed to create a new time card.");
        }
      } else {
        console.error("Error updating time card:", error);
        Alert.alert("Error", "Failed to update the time card.");
      }
    }
  };
  



  const handleUpdateAll = async () => {
    setIsSavingAll(true); // Début du chargement
    try {
      const currentFormattedDate = formatDate(date);

      for (const item of mergeData()) {
        const employeeId = item.employeeId;
        const day = isTimeCard(item) && item.day ? item.day : currentFormattedDate;

        const existingTimeCard = timeCards.find(tc => tc.employeeId === employeeId && tc.day === day) || {} as TimeCardData;

        const updatedData: Partial<TimeCardData> = {};

        // Compare tel, powerbank, startTime, endTime, and lastDelivery
        if (telValues[employeeId] !== existingTimeCard.tel) {
          updatedData.tel = telValues[employeeId];
        }
        if (powerBankValues[employeeId] !== existingTimeCard.powerbank) {
          updatedData.powerbank = powerBankValues[employeeId];
        }
        const startTime = manualStartTimes[employeeId];
        const endTime = manualEndTimes[employeeId];
        const lastDelivery = manualLastDeliveryTimes[employeeId];

        if (startTime !== undefined && startTime !== existingTimeCard.startTime) {
          updatedData.startTime = startTime || existingTimeCard.startTime;
        }
        if (endTime !== undefined && endTime !== existingTimeCard.endTime) {
          updatedData.endTime = endTime || existingTimeCard.endTime;
        }
        if (lastDelivery !== undefined && lastDelivery !== existingTimeCard.lastDelivery) {
          updatedData.lastDelivery = lastDelivery || existingTimeCard.lastDelivery;
        }

        if (Object.keys(updatedData).length === 0) {
          continue;
        }

        const data = {
          employeeId,
          day,
          ...updatedData,
        };

        try {
          await axios.put(`${URL_TimeCard}/timecards/${employeeId}/${encodeURIComponent(day)}?dsp_code=${user.dsp_code}`, data);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            await axios.post(`${URL_TimeCard}/timecards?dsp_code=${user.dsp_code}`, data);
          } else {
            console.error("Error updating time card for employee", employeeId, error);
          }
        }
      }
      Alert.alert("Success", "All data updated successfully.");
      window.alert("All data updated successfully.");
    } catch (error) {
      console.error("Error updating all data:", error);
      Alert.alert("Error", "Failed to update all data.");
      window.alert("Failed to update all data.");
    }
    finally {
      setIsSavingAll(false); // Fin du chargement
    }

  };



  const isTimeCard = (item: VanAssignment | TimeCardData): item is TimeCardData => {
    return '_id' in item;
  };

  const renderItem = ({ item }: { item: VanAssignment | TimeCardData }) => {
    const employeeId = item.employeeId?.trim() || '';
    const day = isTimeCard(item) && item.day ? item.day : formatDate(date); // Utiliser la date sélectionnée si day est indéfini
    const employee = employeeId ? employees[employeeId] : undefined;

    const vanAssignment = vanAssignments.find((assignment) => assignment.employeeId === item.employeeId);
    const van = vanAssignment ? vans[vanAssignment.vanId] : undefined;

    const shiftId = disponibilities[item.employeeId]?.shiftId;
    const shift = shiftId ? shifts[shiftId] : undefined;

    const timeCardStartTimeFormatted = manualStartTimes[employeeId] || (isTimeCard(item) ? formatTimeWithoutSeconds(item.startTime) : '');
    const timeCardEndTimeFormatted = manualEndTimes[employeeId] || (isTimeCard(item) ? formatTimeWithoutSeconds(item.endTime) : '');

    const isStartTimeDifferent = shift?.starttime && timeCardStartTimeFormatted < shift.starttime;
    const isEndTimeDifferent = shift?.endtime && timeCardEndTimeFormatted > shift.endtime;

    return (
      <View style={[styles.row, { backgroundColor: shift?.color || '#ffffff' }]}>
        {/* Afficher Nom et Prénom de l'employé */}

        <Text
          style={styles.cell}
          onPress={() => openCommentModal(employeeId)}
        >
          {employee ? `${employee.name} ${employee.familyName}` : 'N/A'}
          {comments[`${employeeId}_${formatDate(date)}`]?.text ? '  💬 ' : ''}
        </Text>


        {/* Afficher le Van assigné */}
        <Text style={styles.cell}>{van ? `${van.vehicleNumber}` : 'None'}</Text>

        {/* Champ TEL avec valeur filtrée */}
        <View style={styles.inputContainerT_Pb}>
          <Picker
            selectedValue={telValues[employeeId] || ''}
            onValueChange={(value) => handleTelChange(employeeId, value)}
            style={styles.picker}
          >
            <Picker.Item label="NAN" value="" />
            {getAvailablePhones(employeeId).map((phone) => (
              <Picker.Item
                key={phone._id}
                label={
                  telValues[employeeId] === phone._id
                    ? (Platform.OS !== 'web' ? `🔴 ${phone.name}` : phone.name) // Cercle rouge uniquement si non web
                    : phone.name
                }
                value={phone._id}
              />
            ))}
          </Picker>
        </View>

        {/* Champ PowerBank avec valeur filtrée */}
        <View style={styles.inputContainerT_Pb}>
          <Picker
            selectedValue={powerBankValues[employeeId] || ''}
            onValueChange={(value) => handlePowerBankChange(employeeId, value)}
            style={styles.picker}
          >
            <Picker.Item label="NAN" value="" />
            {getAvailablePowerBanks(employeeId).map((powerBank) => (
              <Picker.Item
                key={powerBank._id}
                label={
                  powerBankValues[employeeId] === powerBank._id
                    ? (Platform.OS !== 'web' ? `🔴 ${powerBank.name}` : powerBank.name) // Cercle rouge uniquement si non web
                    : powerBank.name
                }
                value={powerBank._id}
              />
            ))}
          </Picker>
        </View>



        {/* Champ Heure de Début éditable avec alerte si différent */}
        <View style={isStartTimeDifferent ? styles.warningInputContainer : styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={timeCardStartTimeFormatted}
            onChangeText={(text) => setManualStartTimes((prev) => ({ ...prev, [employeeId]: text }))}
            placeholder={
              user.language === 'English' ? 'Start Time' : 'Heure de début'
            }
          />
          {isStartTimeDifferent && <Icon name="alert-circle" size={20} color="red" style={styles.warningIcon} />}
        </View>

        {/* Champ Heure de last delivery  éditable avec alerte si différent */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={
              manualLastDeliveryTimes[employeeId] ??
              (isTimeCard(item) && item.lastDelivery !== null ? item.lastDelivery : '')
            }
            onChangeText={(text) =>
              setManualLastDeliveryTimes((prev) => ({ ...prev, [employeeId]: text }))
            }
            placeholder={
              user.language === 'English' ? 'Last Delivery' : 'Dernière livraison'
            }
          />
        </View>


        {/* Champ Heure de Fin éditable avec alerte si différent */}
        <View style={isEndTimeDifferent ? styles.warningInputContainer : styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={timeCardEndTimeFormatted}
            onChangeText={(text) => setManualEndTimes((prev) => ({ ...prev, [employeeId]: text }))}
            placeholder={
              user.language === 'English' ? 'End Time' : 'Heure de fin'
            }
          />
          {isEndTimeDifferent && <Icon name="alert-circle" size={20} color="red" style={styles.warningIcon} />}
        </View>

        {/* Bouton de Mise à Jour */}
        <TouchableOpacity style={styles.updateButton} onPress={() => handleUpdate(employeeId, day)}>
          <Text style={styles.updateButtonText}>
            {user.language === 'English' ? 'Save' : 'Enregistrer'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001933" />
        <Text style={styles.loadingText}>
          {user.language === 'English' ? 'Loading data...' : 'Chargement des données...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Barre de recherche */}
      <TextInput
        style={styles.searchBar}
        placeholder={
          user.language === 'English' ? 'Search for an employee...' : 'Rechercher un employé...'
        }
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => handleDayChange(-1)} style={styles.dayButton}>
          <MaterialIcons name="arrow-back" size={24} color="#ffff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>{formatDate(date)}</Text>
        <TouchableOpacity onPress={() => handleDayChange(1)} style={styles.dayButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#ffff" />
        </TouchableOpacity>
      </View>


      {/* Bouton de mise à jour globale */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.updateAllButton}
          onPress={handleUpdateAll}
          disabled={isSavingAll} // Désactiver le bouton en cours de chargement
        >
          {isSavingAll ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.updateAllButtonText}>
              {user.language === 'English' ? 'Save All' : 'Tout enregistrer'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.downloadButton} onPress={generateAndDownloadPDF}>
          <Text style={styles.downloadButtonText}>
            {user.language === 'English' ? 'Download' : 'Télécharger'}
          </Text>
        </TouchableOpacity>

        {/* Bouton Refair */}
        {Platform.OS === "web" && (
          <TouchableOpacity
            style={styles.refairButton} // Nouveau style pour Refair
            onPress={onRefresh} // Action à effectuer
          >
            <Text style={styles.refairButtonText}>
              {user.language === 'English' ? 'Refresh' : 'Rafraîchir'}
            </Text>
          </TouchableOpacity>
        )}

      </View>
      {/* Autres éléments de rendu (FlatList, etc.) */}
      {Platform.OS !== 'web' ? (
        <ScrollView horizontal>
          <View>
            <FlatList
              data={filteredData}
              renderItem={renderItem}
              keyExtractor={(item) => (isTimeCard(item) ? item._id : `van-${item.employeeId}`)}
              ListHeaderComponent={
                <View style={styles.tableHeader}>
                  {/* Entêtes de table */}
                  <Text style={styles.headerCell}>
                    {user.language === 'English' ? 'Employee' : 'Employé'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user.language === 'English' ? 'Van' : 'Van'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user.language === 'English' ? 'TEL' : 'TEL'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user.language === 'English' ? 'Battery' : 'Batterie'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user.language === 'English' ? 'Start' : 'Début'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user.language === 'English' ? 'Last Delivery' : 'Dernière livraison'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user.language === 'English' ? 'End' : 'Fin'}
                  </Text>
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
                />
              } // Ajouter le pull-to-refresh

            />
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderItem}
          keyExtractor={(item) => (isTimeCard(item) ? item._id : `van-${item.employeeId}`)}
          ListHeaderComponent={
            <View style={styles.tableHeader}>
              {/* Entêtes de table */}
              <Text style={styles.headerCell}>
                {user.language === 'English' ? 'Employee' : 'Employé'}
              </Text>
              <Text style={styles.headerCell}>
                {user.language === 'English' ? 'Van' : 'Van'}
              </Text>
              <Text style={styles.headerCell}>
                {user.language === 'English' ? 'TEL' : 'TEL'}
              </Text>
              <Text style={styles.headerCell}>
                {user.language === 'English' ? 'Battery' : 'Batterie'}
              </Text>
              <Text style={styles.headerCell}>
                {user.language === 'English' ? 'Start' : 'Début'}
              </Text>
              <Text style={styles.headerCell}>
                {user.language === 'English' ? 'Last Delivery' : 'Dernière livraison'}
              </Text>
              <Text style={styles.headerCell}>
                {user.language === 'English' ? 'End' : 'Fin'}
              </Text>
            </View>
          }

        />
      )}
      {isCommentModalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isCommentModalVisible}
          onRequestClose={() => setIsCommentModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {user.language === 'English'
                  ? `Comment for ${formatDate(date)}`
                  : `Commentaire pour ${formatDate(date)}`}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={currentCommentText}
                onChangeText={setCurrentCommentText}
                placeholder={
                  user.language === 'English' ? 'Write your comment here...' : 'Écrivez votre commentaire ici...'
                }
                multiline
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsCommentModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>
                    {user.language === 'English' ? 'Cancel' : 'Annuler'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveComment}
                >
                  <Text style={styles.saveButtonText}>
                    {user.language === 'English' ? 'Save' : 'Sauvegarder'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => {
                    const currentDay = formatDate(date);
                    const key = `${currentCommentEmployeeId}_${currentDay}`;
                    const commentId = comments[key]?._id;
                    if (commentId) deleteComment(commentId);
                  }}
                >
                  <Text style={styles.deleteButtonText}>
                    {user.language === 'English' ? 'Delete' : 'Supprimer'}
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

export default TimeCard;

const styles = StyleSheet.create({
  refairButton: {
    backgroundColor: '#FF9800', // Couleur différente
    paddingVertical: 8,
    paddingHorizontal: 12, // Plus petit que les autres
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8, // Espacement entre les boutons
    width: 90, // Fixez une largeur spécifique plus petite
  },
  refairButtonText: {
    color: '#fff',
    fontSize: 14, // Taille plus petite pour différencier
    fontWeight: 'bold',
  },
  searchBar: {
    height: 40,
    borderColor: '#001933',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    backgroundColor: '#f4f4f4',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Space between buttons
    alignItems: 'center', // Align buttons vertically in the center
    marginBottom: 8,
    paddingHorizontal: 10, // Add padding for alignment
    gap: 12, // Use `gap` for spacing between items (if supported)
  },
  downloadButton: {
    flex: 1, // Make buttons take equal width
    backgroundColor: 'red',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4, // Add spacing on the right
  },
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  updateAllButton: {
    flex: 1, // Make buttons take equal width
    backgroundColor: '#001933',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4, // Add spacing on the left
  },
  updateAllButtonText: {
    color: '#ffffff', // Use a contrasting color
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#ffff',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dayButton: {
    padding: 10,
    backgroundColor: "#001933",
    borderRadius: 50,
  },
  headerText: {
    color: '#001933',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tableContainer: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#001933',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    width: '100%',
  },
  headerCell: {
    textAlign: 'auto', // Center-align text in the header
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 2, // Center text with padding instead of margin
    flex: 1,
    minWidth: 100,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
    width: '100%',
  },
  cell: {
    textAlign: 'auto', // Center-align text in data cells for consistency with header
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flex: 1,
    minWidth: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f4f4f4',
    height: 30,
    flex: 1,
    minWidth: 100,
    marginHorizontal: 6, // Increase this to add space between input fields
  },
  input: {
    width: '100%',
    paddingVertical: 0,
    paddingHorizontal: 5,
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  warningInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'red',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#ffe6e6',
    height: 30,
    flex: 1,
    minWidth: 100,
    marginHorizontal: 10, // Increase this to add space between input fields
  },
  warningIcon: {
    marginLeft: 0,
    alignSelf: 'center',
  },
  updateButton: {
    backgroundColor: '#001933',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 30,
    minWidth: 100,
    marginHorizontal: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fffff',
  },
  loadingText: {
    marginTop: 10,
    color: '#001933',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningText: {
    color: 'red',
    fontWeight: 'bold',
  },
  inputContainerT_Pb: {
    justifyContent: 'center', // Centre le texte verticalement
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: '#f4f4f4',
    flex: 1,
    minWidth: 100,
    height: 30,
    marginHorizontal: 10, // Increase this to add space between input fields
  },
  picker: {
    height: 30, // Garder une hauteur raisonnable
    width: '101%',
    fontSize: 14,
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Platform.OS !== 'web' ? 12 : 0, // Ajustement pour Android
    textAlignVertical: 'center', // Centre le texte verticalement
    borderColor: "transparent",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent background
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalInput: {
    height: 100,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  cancelButtonText: {
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#FF5252',
  },
  deleteButtonText: {
    color: '#fff',
  },

});


import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, ActivityIndicator, Alert, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Pressable, Modal, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AppURL from '@/components/src/URL';
import PickerModal from '@/components/src/PickerModal';
import { useUser } from '@/context/UserContext';



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

const TimeCard: React.FC = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
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
  const [loadingSave, setLoadingSave] = useState<Record<string, boolean>>({});



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
      userName: `${user?.name} ${user?.familyName}`,
    };

    try {
      const response = await fetch(`${AppURL}/api/download/timecard-pdf?dsp_code=${user?.dsp_code}`, {
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
          if (Platform.OS === 'web') {
            window.alert(
              user?.language === 'English'
                ? 'Failed to process the file for download.'
                : 'Échec du traitement du fichier pour le téléchargement.'
            );
          } else {
            Alert.alert(
              user?.language === 'English' ? 'Error' : 'Erreur',
              user?.language === 'English'
                ? 'Failed to process the file for download.'
                : 'Échec du traitement du fichier pour le téléchargement.'
            );
          }
        };

        reader.readAsDataURL(blob);
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to generate PDF.'
            : 'Échec de la génération du PDF.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to generate PDF.'
            : 'Échec de la génération du PDF.'
        );
      }
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
  const saveComment = async () => {
    if (currentCommentEmployeeId) {
      const currentDay = formatDate(date);
      const key = `${currentCommentEmployeeId}_${currentDay}`;
      const existingComment = comments[key];

      try {
        const data = {
          idEmploye: currentCommentEmployeeId,
          date: currentDay,
          comment: currentCommentText,
        };

        let updatedComments = { ...comments };
        let response;

        if (existingComment) {
          // Mise à jour du commentaire existant
          response = await axios.put(`${URL_Comment}/comments/${existingComment._id}?dsp_code=${user?.dsp_code}`, data);
          updatedComments[key] = { _id: existingComment._id, text: currentCommentText };
        } else {
          // Création d'un nouveau commentaire
          response = await axios.post(`${URL_Comment}/comments/create?dsp_code=${user?.dsp_code}`, data);
          updatedComments[key] = { _id: response.data._id, text: response.data.comment };
        }

        // Message de succès après la création
        if (Platform.OS === 'web') {
          window.alert(
            user?.language === 'English'
              ? 'Comment added successfully!'
              : 'Commentaire ajouté avec succès !'
          );
        } else {
          Alert.alert(
            user?.language === 'English' ? 'Success' : 'Succès',
            user?.language === 'English'
              ? 'Comment added successfully!'
              : 'Commentaire ajouté avec succès !'
          );
        }

        // Mettre à jour l'état local avec les nouveaux commentaires
        setComments(updatedComments);

        // Fermer le modal après la mise à jour du commentaire
        setIsCommentModalVisible(false);

      } catch (error) {
        if (Platform.OS === 'web') {
          window.alert(
            user?.language === 'English'
              ? 'Failed to save the comment.'
              : 'Échec de l’enregistrement du commentaire.'
          );
        } else {
          Alert.alert(
            user?.language === 'English' ? 'Error' : 'Erreur',
            user?.language === 'English'
              ? 'Failed to save the comment.'
              : 'Échec de l’enregistrement du commentaire.'
          );
        }
      }
    }
  };





  const deleteComment = async (commentId: string) => {
    try {
      await axios.delete(`${URL_Comment}/comments/${commentId}?dsp_code=${user?.dsp_code}`);
      setComments((prev) => {
        const updatedComments = { ...prev };
        const keyToDelete = Object.keys(prev).find((key) => prev[key]._id === commentId);
        if (keyToDelete) delete updatedComments[keyToDelete];
        return updatedComments;
      });

      // Message de succès après suppression
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Comment deleted successfully!'
            : 'Commentaire supprimé avec succès !'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Comment deleted successfully!'
            : 'Commentaire supprimé avec succès !'
        );
      }

    } catch (error) {
      // Message d'erreur en cas d'échec
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to delete the comment.'
            : 'Échec de la suppression du commentaire.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to delete the comment.'
            : 'Échec de la suppression du commentaire.'
        );
      }
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
      const phonesRes = await axios.get<Phone[]>(`${AppURL}/api/phones/phones/functional/all?dsp_code=${user?.dsp_code}`);
      const powerBanksRes = await axios.get<PowerBank[]>(`${AppURL}/api/powerbanks/powerbanks/functional/all?dsp_code=${user?.dsp_code}`);

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
    setComments({});
    setLoading(true);

    const formattedDate = formatDate(date);

    try {
      // Étape 1 : Récupérer les données de base en parallèle
      const [vanAssignmentsRes, commentsRes, dispoRes, timeCardRes] = await Promise.all([
        axios
          .get<VanAssignment[]>(
            `${AppURL}/api/vanAssignments/date/${encodeURIComponent(formattedDate)}?dsp_code=${user?.dsp_code}`
          )
          .catch(() => ({ data: [] })), // Retourne un tableau vide en cas d'erreur
        axios
          .get(`${URL_Comment}/comments/date/${encodeURIComponent(formattedDate)}?dsp_code=${user?.dsp_code}`)
          .catch(() => ({ data: [] })), // Retourne un tableau vide en cas d'erreur
        axios
          .get<Disponibility[]>(
            `${AppURL}/api/disponibilites/presence/confirmed-by-day`,
            { params: { selectedDay: formattedDate, dsp_code: user?.dsp_code } }
          )
          .catch(() => ({ data: [] })), // Retourne un tableau vide en cas d'erreur
        axios
          .get<TimeCardData[]>(
            `${URL_TimeCard}/timecardsss/dday/${encodeURIComponent(formattedDate)}`,
            { params: { dsp_code: user?.dsp_code } }
          )
          .catch(() => ({ data: [] })), // Retourne un tableau vide en cas d'erreur
      ]);

      // Étape 2 : Traiter les données récupérées
      const vanAssignments = vanAssignmentsRes.data || [];
      setVanAssignments(vanAssignments);

      const commentsData = commentsRes.data || [];
      const commentsMap = commentsData.reduce((acc: Record<string, Comment>, comment: any) => {
        acc[`${comment.idEmploye}_${comment.date}`] = { _id: comment._id, text: comment.comment };
        return acc;
      }, {});
      setComments(commentsMap);

      const dispoMap = dispoRes.data.reduce((map, dispo) => {
        map[dispo.employeeId] = dispo;
        return map;
      }, {} as Record<string, Disponibility>);
      setDisponibilities(dispoMap);

      const timeCards = timeCardRes.data || [];
      const initialLastDeliveryTimes: Record<string, string> = {};
      timeCards.forEach((tc) => {
        initialLastDeliveryTimes[tc.employeeId] = tc.lastDelivery || '';
      });
      setManualLastDeliveryTimes(initialLastDeliveryTimes);
      setTimeCards(timeCards);
      initializeTelAndPowerBankValues(timeCards);

      // Extraction des IDs nécessaires
      const employeeIds = [...new Set(vanAssignments.map((assignment) => assignment.employeeId))];
      const vanIds = [...new Set(vanAssignments.map((assignment) => assignment.vanId))];
      const shiftIds = [...new Set(Object.values(dispoMap).map((dispo) => dispo.shiftId))];

      // Étape 3 : Récupérer les données dépendantes en parallèle
      const [employeeRes, shiftMap, vanMap] = await Promise.all([
        // Récupérer les employés
        axios
          .post<Employee[]>(`${AppURL}/api/employee/by-ids`, { ids: employeeIds }, { params: { dsp_code: user?.dsp_code } })
          .catch(() => ({ data: [] })), // Retourne un tableau vide en cas d'erreur

        // Récupérer les informations des shifts
        (async () => {
          const shifts: Record<string, Shift> = {};
          await Promise.all(
            shiftIds.map(async (shiftId) => {
              try {
                const shiftRes = await axios.get<Shift>(`${AppURL}/api/shifts/shifts/${shiftId}?dsp_code=${user?.dsp_code}`);
                shifts[shiftRes.data._id] = shiftRes.data;
              } catch {
                // Ignorer les erreurs
              }
            })
          );
          return shifts;
        })(),

        // Récupérer les informations des véhicules
        (async () => {
          const vans: Record<string, Vehicle> = {};
          await Promise.all(
            vanIds.map(async (vanId) => {
              try {
                const vehicleRes = await axios.get<Vehicle>(`${AppURL}/api/vehicles/${vanId}?dsp_code=${user?.dsp_code}`);
                if (vehicleRes.data && vehicleRes.data.data) {
                  vans[vehicleRes.data.data._id] = vehicleRes.data.data;
                }
              } catch {
                // Ignorer les erreurs
              }
            })
          );
          return vans;
        })(),
      ]);

      // Traiter les employés
      const employeeMap = (employeeRes.data || []).reduce((map, employee) => {
        map[employee._id] = employee;
        return map;
      }, {} as Record<string, Employee>);
      setEmployees(employeeMap);

      // Traiter les shifts et les véhicules
      setShifts(shiftMap);
      setVans(vanMap);
    } catch {
      // Ignorer les erreurs générales
    } finally {
      setLoading(false);
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
      day = formatDate(new Date());
    }

    setLoadingSave((prev) => ({ ...prev, [employeeId]: true })); // Activer le chargement pour cet employé

    const existingTimeCard = timeCards.find(tc => tc.employeeId === employeeId && tc.day === day) || {} as TimeCardData;
    const updatedData: Partial<TimeCardData> = {};

    const updateField = (field: keyof TimeCardData, newValue: any, existingValue: any) => {
      if (newValue !== existingValue) {
        updatedData[field] = newValue || existingValue;
      }
    };

    updateField("tel", telValues[employeeId], existingTimeCard.tel);
    updateField("powerbank", powerBankValues[employeeId], existingTimeCard.powerbank);
    updateField("startTime", manualStartTimes[employeeId], existingTimeCard.startTime);
    updateField("endTime", manualEndTimes[employeeId], existingTimeCard.endTime);
    updateField("lastDelivery", manualLastDeliveryTimes[employeeId], existingTimeCard.lastDelivery);

    if (Object.keys(updatedData).length === 0) {
      setLoadingSave((prev) => ({ ...prev, [employeeId]: false })); // Désactiver le chargement
      return;
    }

    const data = {
      employeeId,
      day,
      ...updatedData,
    };

    try {
      await axios.put(`${URL_TimeCard}/timecards/${employeeId}/${encodeURIComponent(day)}?dsp_code=${user?.dsp_code}`, data);
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Time card updated successfully.'
            : 'Carte de pointage mise à jour avec succès.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Time card updated successfully.'
            : 'Carte de pointage mise à jour avec succès.'
        );
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        try {
          await axios.post(`${URL_TimeCard}/timecards?dsp_code=${user?.dsp_code}`, data);

          if (Platform.OS === 'web') {
            window.alert(
              user?.language === 'English'
                ? 'Time card created successfully.'
                : 'Carte de pointage créée avec succès.'
            );
          } else {
            Alert.alert(
              user?.language === 'English' ? 'Success' : 'Succès',
              user?.language === 'English'
                ? 'Time card created successfully.'
                : 'Carte de pointage créée avec succès.'
            );
          }

        } catch (createError) {

          if (Platform.OS === 'web') {
            window.alert(
              user?.language === 'English'
                ? 'Failed to create a new time card.'
                : 'Échec de la création d’une nouvelle carte de pointage.'
            );
          } else {
            Alert.alert(
              user?.language === 'English' ? 'Error' : 'Erreur',
              user?.language === 'English'
                ? 'Failed to create a new time card.'
                : 'Échec de la création d’une nouvelle carte de pointage.'
            );
          }
        }
      } else {
        if (Platform.OS === 'web') {
          window.alert(
            user?.language === 'English'
              ? 'Failed to update the time card.'
              : 'Échec de la mise à jour de la carte de pointage.'
          );
        } else {
          Alert.alert(
            user?.language === 'English' ? 'Error' : 'Erreur',
            user?.language === 'English'
              ? 'Failed to update the time card.'
              : 'Échec de la mise à jour de la carte de pointage.'
          );
        }
      }
    }
    finally {
      setLoadingSave((prev) => ({ ...prev, [employeeId]: false })); // Désactiver le chargement
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
          await axios.put(`${URL_TimeCard}/timecards/${employeeId}/${encodeURIComponent(day)}?dsp_code=${user?.dsp_code}`, data);
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 500) {
            await axios.post(`${URL_TimeCard}/timecards?dsp_code=${user?.dsp_code}`, data);
          } else {
            console.error("Error updating time card for employee", employeeId, error);
          }
        }
      }
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'All data updated successfully.'
            : 'Toutes les données ont été mises à jour avec succès.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'All data updated successfully.'
            : 'Toutes les données ont été mises à jour avec succès.'
        );
      }


    } catch (error) {

      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to update all data.'
            : 'Échec de la mise à jour de toutes les données.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to update all data.'
            : 'Échec de la mise à jour de toutes les données.'
        );
      }

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
          style={[
            styles.cell,

          ]}
          onPress={() => openCommentModal(employeeId)}
        >
          {employee ?
            (Platform.OS === 'web' ?
              `${employee.name} ${employee.familyName}` :
              `${employee.familyName}`) :
            'N/A'}
          {comments[`${employeeId}_${formatDate(date)}`]?.text ? '  💬 ' : ''}
        </Text>

        {/* Afficher le Van assigné */}
        <Text style={styles.cell}>{van ? `${van.vehicleNumber}` : 'None'}</Text>

        {/* Champ TEL avec valeur filtrée */}
        <PickerModal
          title="Select Phone"
          selectedValue={telValues[employeeId] || ''}
          options={[
            { label: 'NAN', value: '' }, // Option par défaut
            ...getAvailablePhones(employeeId).map((phone) => ({
              label:
                telValues[employeeId] === phone._id
                  ? Platform.OS !== 'web'
                    ? `${phone.name}` // Cercle rouge pour non web
                    : phone.name
                  : phone.name,
              value: phone._id,
            })),
          ]}
          onValueChange={(value) => handleTelChange(employeeId, value)}
          style={{
            container: {
              height: 30,
              width: Platform.OS === 'web' ? 250 : 100,
              borderColor: '#001933',
              borderRadius: 8,
              backgroundColor: '#f9f9f9',
              justifyContent: 'center',
              // marginRight: 0, // Ajout d'une marge à droite
              marginHorizontal: 6, // Increase this to add space between input fields

            },
            input: {
              height: 30,
              fontSize: 16,
              color: '#001933',
            },
            picker: {
              backgroundColor: '#ffffff',
            },
          }}
        />


        {/* Champ PowerBank avec valeur filtrée */}

        <PickerModal
          title="Select PowerBank"
          selectedValue={powerBankValues[employeeId] || ''}
          options={[
            { label: 'NAN', value: '' }, // Option par défaut
            ...getAvailablePowerBanks(employeeId).map((powerBank) => ({
              label:
                powerBankValues[employeeId] === powerBank._id
                  ? Platform.OS !== 'web'
                    ? `${powerBank.name}` // Cercle rouge pour non-web
                    : powerBank.name
                  : powerBank.name,
              value: powerBank._id,
            })),
          ]}
          onValueChange={(value) => handlePowerBankChange(employeeId, value)}
          style={{
            container: {
              height: 30,
              width: Platform.OS === 'web' ? 250 : 100,
              borderColor: '#001933',
              borderRadius: 8,
              backgroundColor: '#f9f9f9',
              justifyContent: 'center',
              marginHorizontal: 6, // Increase this to add space between input fields
            },
            input: {
              fontSize: 16,
              height: 30,
              color: '#001933',
            },
            picker: {
              backgroundColor: '#ffffff',
            },
          }}
        />


        {/* Champ Heure de Début éditable avec alerte si différent */}
        <View style={isStartTimeDifferent ? styles.warningInputContainer : styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={timeCardStartTimeFormatted}
            onChangeText={(text) => setManualStartTimes((prev) => ({ ...prev, [employeeId]: text }))}
            placeholder={
              user?.language === 'English' ? 'Start Time' : 'Heure de début'
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
              user?.language === 'English' ? 'Last Delivery' : 'Dernière livraison'
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
              user?.language === 'English' ? 'End Time' : 'Heure de fin'
            }
          />
          {isEndTimeDifferent && <Icon name="alert-circle" size={20} color="red" style={styles.warningIcon} />}
        </View>

        {/* Bouton de Mise à Jour */}
        <TouchableOpacity
          style={styles.updateButton}
          onPress={() => handleUpdate(employeeId, day)}
          disabled={loadingSave[employeeId]} // Désactiver le bouton en cours de chargement
        >
          {loadingSave[employeeId] ? ( // Afficher le spinner si en cours de chargement
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.updateButtonText}>
              {user?.language === 'English' ? 'Save' : 'Enregistrer'}
            </Text>
          )}
        </TouchableOpacity>

      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#001933" />
        <Text style={styles.loadingText}>
          {user?.language === 'English' ? 'Loading data...' : 'Chargement des données...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Barre de recherche */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder={
            user?.language === 'English' ? ' 🔍 Search for an employee...' : ' 🔍 Rechercher un employé...'
          }
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

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
              {user?.language === 'English' ? 'Save All' : 'Tout enregistrer'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.downloadButton} onPress={generateAndDownloadPDF}>
          <Text style={styles.downloadButtonText}>
            {user?.language === 'English' ? 'PDF' : 'PDF'}
          </Text>
        </TouchableOpacity>

        {/* Bouton Refair */}
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
                    {user?.language === 'English' ? 'Employee' : 'Employé'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user?.language === 'English' ? 'Van' : 'Van'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user?.language === 'English' ? 'TEL' : 'TEL'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user?.language === 'English' ? 'Battery' : 'Batterie'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user?.language === 'English' ? 'Start' : 'Début'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user?.language === 'English' ? 'Last Delivery' : 'Dernière livraison'}
                  </Text>
                  <Text style={styles.headerCell}>
                    {user?.language === 'English' ? 'End' : 'Fin'}
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
                {user?.language === 'English' ? 'Employee' : 'Employé'}
              </Text>
              <Text style={styles.headerCell}>
                {user?.language === 'English' ? 'Van' : 'Van'}
              </Text>
              <Text style={styles.headerCell}>
                {user?.language === 'English' ? 'TEL' : 'TEL'}
              </Text>
              <Text style={styles.headerCell}>
                {user?.language === 'English' ? 'Battery' : 'Batterie'}
              </Text>
              <Text style={styles.headerCell}>
                {user?.language === 'English' ? 'Start' : 'Début'}
              </Text>
              <Text style={styles.headerCell}>
                {user?.language === 'English' ? 'Last Delivery' : 'Dernière livraison'}
              </Text>
              <Text style={styles.headerCell}>
                {user?.language === 'English' ? 'End' : 'Fin'}
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
                {user?.language === 'English'
                  ? `Comment for ${formatDate(date)}`
                  : `Commentaire pour ${formatDate(date)}`}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={currentCommentText}
                onChangeText={setCurrentCommentText}
                placeholder={
                  user?.language === 'English' ? 'Write your comment here...' : 'Écrivez votre commentaire ici...'
                }
                multiline
              />
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsCommentModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>
                    {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={saveComment}
                >
                  <Text style={styles.saveButtonText}>
                    {user?.language === 'English' ? 'Save' : 'Sauvegarder'}
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
                    {user?.language === 'English' ? 'Delete' : 'Supprimer'}
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

  searchBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Space between buttons
    alignItems: 'center', // Align buttons vertically in the center
    marginBottom: 6,
    paddingHorizontal: 6, // Add padding for alignment
    gap: 12, // Use `gap` for spacing between items (if supported)
  },
  downloadButton: {
    flex: 1, // Make buttons take equal width
    backgroundColor: 'red',
    paddingVertical: 8,
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
    marginBottom: 5,
  },
  dayButton: {
    padding: 10,
    backgroundColor: "#001933",
    borderRadius: 30,
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
    paddingVertical: 5,
    paddingHorizontal: 2, // Center text with padding instead of margin
    flex: 1,
    minWidth: 100,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    alignItems: 'center',
    width: '100%',
  },
  cell: {
    textAlign: 'left', // Center-align text in data cells for consistency with header
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#001933',
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
    color: '#001933',
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
    backgroundColor: '#001933',
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


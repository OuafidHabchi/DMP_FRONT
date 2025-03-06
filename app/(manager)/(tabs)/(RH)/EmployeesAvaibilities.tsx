import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, Platform, Dimensions, ActivityIndicator, Modal } from 'react-native';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons'; // Import icons
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';

type ScoreCard = 'Fantastic' | 'Great' | 'Fair' | 'Poor' | 'New DA';
// Type for employees
type Employee = {
  suspensions: any;
  _id: string;
  name: string;
  familyName: string;
  scoreCard: ScoreCard; // Typé avec ScoreCard
  expoPushToken: string;
};

// Type for shifts
type Shift = {
  _id: string;
  name: string;
  starttime: string;
  endtime: string;
  color: string; // New property for the shift color
  visible: boolean;
};

// Type for availability
type Disponibility = {
  _id: string; // Added to allow deletion
  expoPushToken: string;
  employeeId: string;
  selectedDay: string;
  shiftId: string;
  status?: 'accepted' | 'rejected'; // Add status for each availability
  counted?: boolean; // To know if this availability has already been counted
  decisions?: 'pending' | 'accepted' | 'rejected'; // Correction: use of "decisions" with an "s"
  reason?: string; // ✅ Correction ici (string au lieu de String)
};

const EmployeesAvaibilities = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [disponibilities, setDisponibilities] = useState<Disponibility[]>([]);
  const [currentWeekDates, setCurrentWeekDates] = useState<Date[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ employeeId: string, date: Date } | null>(null); // State to manage the selected cell
  const [acceptedCount, setAcceptedCount] = useState(0); // Counter for accepted shifts
  const [rejectedCount, setRejectedCount] = useState(0); // Counter for rejected shifts
  const [showShiftPicker, setShowShiftPicker] = useState<{ employeeId: string, date: Date } | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isWeekView, setIsWeekView] = useState(true);  // New state to manage week/day view
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Add state for the search bar
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [isSummaryModalVisible, setIsSummaryModalVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // Indique s'il y a des changements non publiés
  const [isPublishing, setIsPublishing] = useState(false); // État de chargement pour le bouton Publish
  const [isPredictionModalVisible, setIsPredictionModalVisible] = useState(false);
  const [predictedNeeds, setPredictedNeeds] = useState<Record<string, Record<string, { needed: number, extra: number }>>>({});
  // État pour gérer l'affichage du modal et son contenu
  const [modalVisible, setModalVisible] = useState(false);
  const [modalReasonText, setModalReasonText] = useState('');
  const [missingShifts, setMissingShifts] = useState<Record<string, any>>({});
  const [isMissingShiftsModalVisible, setIsMissingShiftsModalVisible] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [hasMissingShifts, setHasMissingShifts] = useState(false);
  const [planningMode, setPlanningMode] = useState<'strict' | 'smart' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dispoParEmploye, setDispoParEmploye] = useState<Record<string, { total: number; accepte: number }>>({});

  // Filter employees according to search
  useEffect(() => {
    if (searchQuery === '') {
      const sortedEmployees = [...employees].sort((a, b) => {
        const scorePriority = {
          Fantastic: 1,
          Great: 2,
          Fair: 3,
          Poor: 4,
          'New DA': 5,
        };

        return (
          (scorePriority[a.scoreCard] || 6) - (scorePriority[b.scoreCard] || 6)
        );
      });

      setFilteredEmployees(sortedEmployees);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filteredAndSortedEmployees = [...employees]
        .filter(
          (employee) =>
            employee.name.toLowerCase().includes(lowerCaseQuery) ||
            employee.familyName.toLowerCase().includes(lowerCaseQuery)
        )
        .sort((a, b) => {
          const scorePriority = {
            Fantastic: 1,
            Great: 2,
            Fair: 3,
            Poor: 4,
            'New DA': 5,
          };

          return (
            (scorePriority[a.scoreCard] || 6) - (scorePriority[b.scoreCard] || 6)
          );
        });

      setFilteredEmployees(filteredAndSortedEmployees);
    }
  }, [searchQuery, employees]);



  useEffect(() => {
    calculateMissingShifts();
  }, [disponibilities, currentWeekDates, shifts]);

  useEffect(() => {
    calculerDisposParEmploye(disponibilities);
  }, [disponibilities, currentWeekDates]);


  // Utilisation dans le useEffect
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Charger les disponibilités et l'état depuis AsyncStorage
        const savedChanges = await AsyncStorage.getItem('unsavedChanges');
        const parsedChanges = savedChanges ? JSON.parse(savedChanges) : null;
        // 🔥 Correction : Utilisation de la date calculée en utilisant getWeekDates
        const startOfWeekStr = getWeekDates(weekOffset)[0].toDateString();

        if (parsedChanges && currentWeekDates.length > 0 && parsedChanges.startOfWeek === startOfWeekStr) {
          setDisponibilities(parsedChanges.changes);
          setHasUnsavedChanges(true);
        } else {
          setDisponibilities([]);
          setHasUnsavedChanges(false);
        }

        // 🔹 Récupérer `hasMissingShifts` depuis AsyncStorage
        const savedMissingShiftsState = await AsyncStorage.getItem('hasMissingShifts');
        // 🔥 Correction : Toujours recalculer après chargement
        setHasMissingShifts(savedMissingShiftsState ? JSON.parse(savedMissingShiftsState) : false);
        // 🔥 Recalcule toujours les shifts manquants pour être sûr de l'état
        calculateMissingShifts();

        // 🔥 Utilisation de Promise.all pour les requêtes parallèles
        const [employeesResponse, shiftsResponse, dispoResponse] = await Promise.all([
          axios.get(`${AppURL}/api/employee`, {
            params: { dsp_code: user?.dsp_code },
          }),
          axios.get(`${AppURL}/api/shifts/shifts`, {
            params: { dsp_code: user?.dsp_code },
          }),
          axios.get(`${AppURL}/api/disponibilites/disponibilites`, {
            params: { dsp_code: user?.dsp_code },
          }),
        ]);

        const backendDisponibilities: Disponibility[] = dispoResponse.data;

        // 🔥 Fusionner les données backend et locales
        const mergedDisponibilities = backendDisponibilities.map((backendDispo) => {
          const localChange = parsedChanges?.changes?.find(
            (change: Disponibility) =>
              change.employeeId === backendDispo.employeeId &&
              change.selectedDay === backendDispo.selectedDay
          );
          return localChange ? { ...backendDispo, ...localChange } : backendDispo;
        });

        // 🔥 Mise à jour des états
        setEmployees(employeesResponse.data);
        setShifts(shiftsResponse.data);
        setDisponibilities(mergedDisponibilities);
        setFilteredEmployees(employeesResponse.data);
        calculerDisposParEmploye(mergedDisponibilities);
      } catch (error) {
        console.error('❌ Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    // 🔥 Mise à jour des dates de la semaine
    const updatedWeekDates = getWeekDates(weekOffset);
    setCurrentWeekDates(updatedWeekDates);

    fetchData();
  }, [weekOffset]);






  const openReasonModal = (text: string) => {
    setModalReasonText(text);
    setModalVisible(true);
  };

  const calculateMissingShifts = () => {
    const newMissingShifts: Record<string, any> = {};

    currentWeekDates.forEach((date) => {
      const dateStr = date.toDateString();

      shifts.forEach((shift) => {
        const dayDispos = disponibilities.filter(
          (dispo) =>
            dispo.selectedDay === dateStr &&
            dispo.shiftId === shift._id &&
            dispo.decisions === 'accepted'
        );

        const acceptedCount = dayDispos.length;

        // Vérifier si le shift est nécessaire ce jour-là
        const requiredShifts = predictedNeeds[dateStr]?.[shift._id]?.needed || 0;

        if (requiredShifts > acceptedCount) {
          newMissingShifts[dateStr] = newMissingShifts[dateStr] || [];
          newMissingShifts[dateStr].push({
            shiftId: shift._id,
            needed: requiredShifts,
            accepted: acceptedCount,
            missing: requiredShifts - acceptedCount,
          });
        }
      });
    });

    // Mettre à jour les états
    setMissingShifts(newMissingShifts);
    const hasMissing = Object.keys(newMissingShifts).length > 0;
    setHasMissingShifts(hasMissing);
  };




  const openPredictionModal = () => {
    const newWeekData: Record<string, Record<string, { needed: number, extra: number }>> = {};

    currentWeekDates.forEach((date) => {
      const dateStr = date.toDateString();
      newWeekData[dateStr] = {};

      shifts
        .filter((shift) => shift.visible) // Filtrer les shifts visibles
        .forEach((shift) => {
          newWeekData[dateStr][shift._id] = { needed: 0, extra: 0 };
        });
    });

    setPredictedNeeds(newWeekData);
    setIsPredictionModalVisible(true);
  };


  const updatePredictedNeeds = (dateStr: string, shiftId: string, field: "needed" | "extra", value: string) => {
    const newValue = Math.max(0, parseInt(value) || 0);

    setPredictedNeeds((prev) => ({
      ...prev,
      [dateStr]: {
        ...prev[dateStr],
        [shiftId]: {
          ...prev[dateStr][shiftId],
          [field]: newValue,
        },
      },
    }));
  };

  const submitPrediction = async () => {
    if (!planningMode) {
      setErrorMessage(user?.language === "English"
        ? "Please select a planning mode before submitting."
        : "Veuillez sélectionner un mode de planification avant d'envoyer.");
      return;
    }

    try {
      setIsPredicting(true); // Active l'effet de chargement

      const response = await axios.post(`${AppURL}/api/prediction/predict-shifts`, {
        dsp_code: user?.dsp_code,
        weekRange: {
          start: currentWeekDates[0].toDateString(),
          end: currentWeekDates[currentWeekDates.length - 1].toDateString()
        },
        requiredShiftsPerDay: predictedNeeds,
        optimization: planningMode === 'smart' // Envoie `true` si smart, sinon `false`
      });


      if (response.data.missingShifts && Object.keys(response.data.missingShifts).length > 0) {
        setMissingShifts(response.data.missingShifts);
      } else {
        setMissingShifts({});
      }


      const newPredictions: Disponibility[] = response.data.predictions.map((prediction: any) => ({
        _id: prediction._id || '',
        employeeId: prediction.employeeId,
        selectedDay: prediction.selectedDay,
        shiftId: prediction.shiftId,
        decisions: prediction.status || 'pending',
        status: prediction.status || 'pending',
        expoPushToken: prediction.expoPushToken || '',
        reason: prediction.reason || '', // ✅ Assurez-vous d'inclure la raison
      }));

      setDisponibilities((prev) => {
        const updatedDisponibilities = prev.map((dispo) => {
          const predicted = newPredictions.find((pred) =>
            pred.employeeId === dispo.employeeId && pred.selectedDay === dispo.selectedDay
          );
          return predicted
            ? { ...dispo, decisions: predicted.decisions, status: predicted.status, reason: predicted.reason }
            : dispo;

        });

        return [
          ...updatedDisponibilities,
          ...newPredictions.filter((pred) =>
            !prev.some((d) => d.employeeId === pred.employeeId && d.selectedDay === pred.selectedDay)
          )
        ];
      });

      setHasUnsavedChanges(true);
      setIsPredicting(false); // Désactive l'effet de chargement
      setIsPredictionModalVisible(false);
      setHasMissingShifts(true);


    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'An error occurred while submitting prediction.'
          : 'Une erreur est survenue lors de la soumission de la prédiction.'
      );

      window.alert(
        user?.language === 'English'
          ? 'An error occurred while submitting prediction.'
          : 'Une erreur est survenue lors de la soumission de la prédiction.'
      );

      setIsPredicting(false); // Désactive l'effet de chargement

    }
  };

  const saveUnsavedChangesToStorage = async (
    changes: Disponibility[],
    hasUnsaved: boolean,
    missingShifts: Record<string, any>
  ) => {
    try {
      // Ajouter la date de début de semaine actuelle
      const startOfWeek = currentWeekDates[0].toDateString();

      // Enregistrer les changements avec la date de début de semaine
      const dataToSave = {
        startOfWeek,
        changes,
      };

      await AsyncStorage.setItem('unsavedChanges', JSON.stringify(dataToSave));
      await AsyncStorage.setItem('hasUnsavedChanges', JSON.stringify(hasUnsaved));
      await AsyncStorage.setItem('missingShifts', JSON.stringify(missingShifts));

      // Vérifier si `missingShifts` contient réellement des shifts manquants
      const hasMissing = Object.keys(missingShifts).length > 0;
      await AsyncStorage.setItem('hasMissingShifts', JSON.stringify(hasMissing));

      // Mettre à jour l'état aussi
      setHasMissingShifts(hasMissing);
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Unable to save unsaved changes.'
          : 'Impossible de sauvegarder les modifications non enregistrées.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Unable to save unsaved changes.'
          : 'Impossible de sauvegarder les modifications non enregistrées.'
      );

    }
  };





  // Function to prepare the summary data structure for the current week
  const getWeeklyShiftSummary = () => {
    // Create an object to hold shift counts for each type across the days
    const shiftSummary = shifts.map((shift) => {
      const daysSummary = currentWeekDates.map((date) => {
        const dateString = date.toDateString();
        const dayDisponibilities = disponibilities.filter(
          (dispo) => dispo.shiftId === shift._id && new Date(dispo.selectedDay).toDateString() === dateString
        );

        // Count by status
        const pendingCount = dayDisponibilities.filter((dispo) => dispo.decisions === 'pending').length;
        const acceptedCount = dayDisponibilities.filter((dispo) => dispo.decisions === 'accepted').length;
        const rejectedCount = dayDisponibilities.filter((dispo) => dispo.decisions === 'rejected').length;

        return {
          date: dateString,
          pending: pendingCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
        };
      });

      return {
        shiftName: shift.name,
        color: shift.color,
        daysSummary,
      };
    });

    return shiftSummary;
  };



  const toggleSummaryModal = () => {
    setIsSummaryModalVisible(!isSummaryModalVisible);
  };


  // Correction de la fonction getWeekDates
  const getWeekDates = (weekOffset = 0) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi

    // 🔥 Correction: Toujours commencer la semaine le dimanche
    const startOfWeek = new Date(today.setDate(today.getDate() - currentDay + (weekOffset * 7)));
    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    return weekDates;
  };




  const calculerDisposParEmploye = (dispos: Disponibility[]) => {
    const dispoMapping: Record<string, { total: number; accepte: number }> = {};

    // Convertir les dates de la semaine en chaînes pour comparaison
    const weekDatesStrings = currentWeekDates.map(date => date.toDateString());

    dispos.forEach((dispo) => {
      const empId = dispo.employeeId;
      const dispoDateStr = new Date(dispo.selectedDay).toDateString();

      // Vérifier si la dispo appartient bien à la semaine actuelle
      if (weekDatesStrings.includes(dispoDateStr)) {
        if (!dispoMapping[empId]) {
          dispoMapping[empId] = { total: 0, accepte: 0 };
        }
        dispoMapping[empId].total += 1;
        if (dispo.status === 'accepted') {
          dispoMapping[empId].accepte += 1;
        }
      }
    });

    setDispoParEmploye(dispoMapping);
  };







  // Function to check if an employee is available for a shift on a given date
  const getEmployeeShiftForDay = (employeeId: string, date: Date) => {
    const dateString = date.toDateString();
    const dispoForDay = disponibilities.find(
      (dispo) => dispo.employeeId === employeeId && dispo.selectedDay === dateString
    );
    return dispoForDay ? shifts.find((shift) => shift._id === dispoForDay.shiftId) : null;
  };




  // Change week or day
  const handleWeekChange = (direction: 'prev' | 'next') => {
    if (isWeekView) {
      setWeekOffset((prevOffset) => (direction === 'next' ? prevOffset + 1 : prevOffset - 1));
      setCurrentWeekDates(getWeekDates(weekOffset));
    } else {
      setSelectedDay((prevDate) => {
        const newDate = new Date(prevDate || new Date());
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        return newDate;
      });
    }
  };

  const handleResetToCurrent = () => {
    setWeekOffset(0);
    setSelectedDay(new Date());
    setCurrentWeekDates(getWeekDates(0)); // Reset to current week
  };

  const handleCellPress = (employeeId: string, date: Date, event: any) => {
    const shift = getEmployeeShiftForDay(employeeId, date);
    if (!shift) {
      setShowShiftPicker({ employeeId, date });
      return;
    }
    setSelectedCell({ employeeId, date });
  };


  const handleShiftSelection = async (shiftId: string) => {
    if (!showShiftPicker) return;

    const { employeeId, date } = showShiftPicker;
    const selectedEmployee = employees.find((employee) => employee._id === employeeId);

    if (!selectedEmployee) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Employee not found.'
          : 'Employé non trouvé.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Employee not found.'
          : 'Employé non trouvé.'
      );
      return;
    }

    try {
      const response = await axios.post(`${AppURL}/api/disponibilites/disponibilites/create`, {
        employeeId,
        selectedDay: date.toDateString(),
        shiftId,
        decisions: 'pending', // Disponibilité créée avec le statut 'pending'
        expoPushToken: selectedEmployee.expoPushToken, // Ajouter expoPushToken dans la requête
        dsp_code: user?.dsp_code, // Ajout de dsp_code
      });

      const newDisponibility = response.data;
      setDisponibilities((prevDisponibilities) => [...prevDisponibilities, newDisponibility]);
      setShowShiftPicker(null);
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'An error occurred while creating the disponibility.'
          : 'Une erreur est survenue lors de la création de la disponibilité.'
      );

      window.alert(
        user?.language === 'English'
          ? 'An error occurred while creating the disponibility.'
          : 'Une erreur est survenue lors de la création de la disponibilité.'
      );
    }
  };

  const handleAccept = async (employeeId: string, date: Date) => {
    setDisponibilities((prev) =>
      prev.map((dispo) => {
        if (dispo.employeeId === employeeId && new Date(dispo.selectedDay).toDateString() === date.toDateString()) {
          if (dispo.status === 'rejected') {
            setRejectedCount((prev) => prev - 1);
            setAcceptedCount((prev) => prev + 1);
          } else if (!dispo.status) {
            setAcceptedCount((prev) => prev + 1);
          }

          const updatedDispo: Disponibility = {
            ...dispo,
            status: 'accepted', // Utilisation correcte du type
            decisions: 'accepted',
          };

          setHasUnsavedChanges(true);
          saveUnsavedChangesToStorage([...prev.filter((d) => d !== dispo), updatedDispo], true, missingShifts);



          return updatedDispo;
        }
        return dispo;
      })
    );
    setSelectedCell(null);
  };


  const handleReject = async (employeeId: string, date: Date) => {
    setDisponibilities((prev) =>
      prev.map((dispo) => {
        if (dispo.employeeId === employeeId && new Date(dispo.selectedDay).toDateString() === date.toDateString()) {
          if (dispo.status === 'accepted') {
            setAcceptedCount((prev) => prev - 1);
            setRejectedCount((prev) => prev + 1);
          } else if (!dispo.status) {
            setRejectedCount((prev) => prev + 1);
          }

          const updatedDispo: Disponibility = {
            ...dispo,
            status: 'rejected', // Utilisation correcte du type
            decisions: 'rejected',
          };

          setHasUnsavedChanges(true);
          saveUnsavedChangesToStorage([...prev.filter((d) => d !== dispo), updatedDispo], true, missingShifts);

          return updatedDispo;
        }
        return dispo;
      })
    );
    setSelectedCell(null);
  };


  const handleDelete = async (disponibilityId: string) => {
    try {
      await axios.delete(`${AppURL}/api/disponibilites/disponibilites/${disponibilityId}`, {
        params: { dsp_code: user?.dsp_code }, // Ajout de dsp_code dans la requête
      });

      setDisponibilities((prev) => prev.filter((dispo) => dispo._id !== disponibilityId));
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'An error occurred while deleting the shift.'
          : 'Une erreur est survenue lors de la suppression du shift.'
      );

      window.alert(
        user?.language === 'English'
          ? 'An error occurred while deleting the shift.'
          : 'Une erreur est survenue lors de la suppression du shift.'
      );

    }
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true); // Démarrer le chargement

      // Extraire les décisions acceptées ou refusées
      const decisions = disponibilities
        .filter((dispo) => dispo.status === 'accepted' || dispo.status === 'rejected')
        .map((dispo) => ({
          employeeId: dispo.employeeId,
          selectedDay: dispo.selectedDay,
          shiftId: dispo.shiftId,
          status: dispo.status || dispo.decisions, // ✅ Utiliser `status` ou `decisions`
        }));

      // Envoyer les données au backend
      await axios.post(`${AppURL}/api/disponibilites/updateDisponibilites`, {
        decisions,
        dsp_code: user?.dsp_code,
      });

      // ✅ Supprimer toutes les données du stockage local (AsyncStorage)
      const keysToRemove = [
        'unsavedChanges',
        'hasUnsavedChanges',
        'missingShifts',
        'hasMissingShifts',
        'predictedDisponibilities',
        'predictedDecisions',

      ];

      await Promise.all(keysToRemove.map(key => AsyncStorage.removeItem(key)));

      // Réinitialiser l'état des modifications non publiées
      setHasUnsavedChanges(false);
      setHasMissingShifts(false);

      Alert.alert(
        user?.language === 'English' ? 'Success' : 'Succès',
        user?.language === 'English'
          ? 'The decisions have been successfully published.'
          : 'Les décisions ont été publiées avec succès.'
      );

      window.alert(
        user?.language === 'English'
          ? 'The decisions have been successfully published.'
          : 'Les décisions ont été publiées avec succès.'
      );
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'An error occurred while publishing the decisions.'
          : 'Une erreur est survenue lors de la publication des décisions.'
      );

      window.alert(
        user?.language === 'English'
          ? 'An error occurred while publishing the decisions.'
          : 'Une erreur est survenue lors de la publication des décisions.'
      );
    } finally {
      setIsPublishing(false); // Arrêter le chargement
    }
  };




  return (
    <View style={styles.container}>
      {loading ? ( // Show loader when loading
        <ActivityIndicator size="large" color="#001933" />
      ) : (
        <>
          <View style={styles.header}>

            <View style={styles.weekControls}>
              {/* Button to change the view */}
              <TouchableOpacity onPress={() => setIsWeekView(!isWeekView)} style={styles.toggleButton}>
                <Text style={styles.toggleButtonText}>
                  {user?.language === 'English' ? (isWeekView ? 'See by day' : 'See by week') : (isWeekView ? 'jour' : 'semaine')}
                </Text>
              </TouchableOpacity>

              {/* Button for the summary */}
              <TouchableOpacity onPress={toggleSummaryModal} style={styles.summaryButton}>
                <Text style={styles.summaryButtonText}>
                  {user?.language === 'English' ? 'Summary' : 'Résumé'}
                </Text>
              </TouchableOpacity>

              {/* Button to reset to today */}
              <TouchableOpacity onPress={handleResetToCurrent} style={styles.resetButton}>
                <Text style={styles.resetButtonText}>
                  <Text style={styles.resetButtonText}>Today</Text>
                </Text>
              </TouchableOpacity>
            </View>


            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchBar}
                placeholder={user?.language === 'English' ? ' 🔍 Search employee by name' : ' 🔍 Rechercher un employé par nom'}
                value={searchQuery}
                onChangeText={(text) => setSearchQuery(text)}
              />
            </View>

            <View style={styles.weekControls}>
              {/* Bouton pour aller à la semaine précédente */}
              <TouchableOpacity onPress={() => handleWeekChange('prev')} style={styles.navButton}>
                <MaterialIcons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Étiquette de la semaine/jour actuelle */}
              <View style={styles.weekLabelContainer}>
                <Text style={styles.weekLabel}>
                  {isWeekView
                    ? `Week of ${currentWeekDates[0]?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
                    : `Day of ${selectedDay?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}`}
                </Text>
              </View>

              {/* Bouton pour aller à la semaine suivante */}
              <TouchableOpacity onPress={() => handleWeekChange('next')} style={styles.navButton}>
                <MaterialIcons name="arrow-forward" size={24} color="#fff" />
              </TouchableOpacity>
            </View>



            <View style={[styles.counterContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              {/* Bouton Predict (à gauche) */}
              <TouchableOpacity style={[styles.predictionModalSubmitButton, { flex: 1 }]} onPress={openPredictionModal}>
                <Text style={styles.predictionModalButtonText}>
                  {user?.language === "English" ? "Auto-Schedule" : "Planification Auto"}
                </Text>
              </TouchableOpacity>


              {Platform.OS === 'web' && hasUnsavedChanges && (
                <TouchableOpacity
                  style={[
                    styles.missingShiftsButton,
                    Object.keys(missingShifts).length > 0 ? styles.missingShiftsButtonRed : styles.missingShiftsButtonGreen,
                  ]}
                  onPress={() => {
                    if (Object.keys(missingShifts).length > 0) {
                      setIsMissingShiftsModalVisible(true);
                    }
                  }}
                  disabled={Object.keys(missingShifts).length === 0} // Désactive le bouton si aucun manque
                >
                  <Text style={styles.missingShiftsButtonText}>
                    {Object.keys(missingShifts).length > 0
                      ? (user?.language === 'English' ? 'Missing Drivers detected!' : 'Chauffeurs manquants détectés!')
                      : (user?.language === 'English' ? 'All shifts covered' : 'Tous les shifts sont couverts')}
                  </Text>
                </TouchableOpacity>
              )}


              {/* Zone réservée pour le message Unsaved Changes (au centre) */}
              {hasUnsavedChanges && Platform.OS === 'web' ? (
                <View style={[styles.unsavedChangesContainer, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.unsavedChangesText}>
                    {user?.language === 'English'
                      ? 'You have unsaved changes! Don\'t forget to publish.'
                      : 'Vous avez des modifications non publiées ! N\'oubliez pas de publier.'}
                  </Text>
                </View>
              ) : (
                <View style={{ flex: 1 }} /> // 🔹 Espace réservé SANS le cadre jaune
              )}

              {/* Bouton Publish (à droite) */}
              <TouchableOpacity
                onPress={handlePublish}
                style={[styles.publishButton, { flex: 1 }]}
                disabled={isPublishing}
              >
                {isPublishing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.publishButtonText}>
                    {user?.language === 'English' ? 'Publish' : 'Publier'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>


          <View style={styles.shiftColorsContainer}>
            <ScrollView horizontal
              showsHorizontalScrollIndicator={false} // Cache le scroll bar horizontal pour garder le design propre
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-around' }} // Centre le contenu si le scroll n'est pas nécessaire
            >
              {shifts.map((shift) => (
                <View key={shift._id} style={styles.shiftCircleContainer}>
                  <View style={[
                    styles.shiftCircle,
                    {
                      backgroundColor: shift.color,
                      width: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20,
                      height: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20
                    }]}
                  />
                  <Text style={[
                    styles.shiftName,
                    { fontSize: Platform.OS === 'android' || Platform.OS === 'ios' ? 10 : 14 }
                  ]}>{shift.name}</Text>
                </View>
              ))}
              <View style={styles.shiftCircleContainer}>
                <View style={[
                  styles.shiftCircle,
                  {
                    backgroundColor: '#ccc',
                    width: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20,
                    height: Platform.OS === 'android' || Platform.OS === 'ios' ? 15 : 20
                  }]}
                />
                <Text style={[
                  styles.shiftName,
                  { fontSize: Platform.OS === 'android' || Platform.OS === 'ios' ? 10 : 14 }
                ]}>No availability</Text>
              </View>
            </ScrollView>
          </View>

          <ScrollView style={styles.table}
          >
            {isWeekView ? (
              <>
                <View style={styles.headerRow}>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Employee</Text>
                  {currentWeekDates.map((date, index) => (
                    <Text key={index} style={styles.headerCell}>
                      {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                    </Text>
                  ))}
                </View>

                {filteredEmployees.map((employee) => {
                  return (
                    <View key={employee._id} style={styles.row}>
                      {/* Affichage du nom de l'employé avec suspension */}
                      <Text style={[styles.employeeCell, { flex: 2 }]}>
                        {employee.name} {employee.familyName} ({employee.scoreCard})
                        {"   "}
                        <Text style={{ fontSize: 12 }}>
                          <Text style={{ color: 'green', fontWeight: 'bold' }}>
                            {dispoParEmploye[employee._id]?.accepte || 0}
                          </Text>
                          /
                          <Text style={{ color: '#001933' }}>
                            {dispoParEmploye[employee._id]?.total || 0}
                          </Text>
                        </Text>

                      </Text>


                      {/* Boucle sur les dates de la semaine */}
                      {currentWeekDates.map((date, index) => {
                        const shift = getEmployeeShiftForDay(employee._id, date);
                        const isSelected =
                          selectedCell?.employeeId === employee._id &&
                          selectedCell?.date.toDateString() === date.toDateString();

                        const dispo = disponibilities.find(
                          (d) =>
                            d.employeeId === employee._id &&
                            new Date(d.selectedDay).toDateString() === date.toDateString()
                        );

                        return (
                          <TouchableOpacity
                            key={`${employee._id}-${index}`} // Clé unique par employé et date
                            style={[styles.cell, { backgroundColor: shift ? shift.color : '#ccc', position: 'relative' }]} // Ajout de position: 'relative'
                            onPress={(event) => handleCellPress(employee._id, date, event)}
                          >
                            {/* Affichage du statut */}
                            {dispo?.decisions === 'accepted' && (
                              <>
                                <Icon name="checkmark-circle" size={24} color="green" />
                                {Platform.OS === 'web' && !!dispo.reason && (
                                  <TouchableOpacity onPress={() => openReasonModal(dispo.reason ?? '')} style={styles.reasonTouchable}>
                                    <View style={styles.reasonModalIconContainer}>
                                      <Text style={styles.reasonModalIconText}>!</Text>
                                    </View>
                                  </TouchableOpacity>
                                )}
                              </>
                            )}

                            {dispo?.decisions === 'rejected' && (
                              <>
                                <Icon name="close-circle" size={24} color="red" />
                                {Platform.OS === 'web' && !!dispo.reason && (
                                  <TouchableOpacity onPress={() => openReasonModal(dispo.reason ?? '')} style={styles.reasonTouchable}>
                                    <View style={styles.reasonModalIconContainer}>
                                      <Text style={styles.reasonModalIconText}>!</Text>
                                    </View>
                                  </TouchableOpacity>
                                )}
                              </>
                            )}

                            {dispo?.decisions === 'pending' && (
                              <Text style={styles.statusPending}>?</Text>
                            )}

                            {/* Icônes d'actions */}
                            {isSelected && (
                              <View style={styles.iconContainerWeek}>
                                <Icon
                                  name="checkmark-circle"
                                  size={24}
                                  color="green"
                                  onPress={() => handleAccept(employee._id, date)}
                                />
                                <Icon
                                  name="close-circle"
                                  size={24}
                                  color="red"
                                  onPress={() => handleReject(employee._id, date)}
                                />
                                <Icon
                                  name="trash"
                                  size={24}
                                  color="gray"
                                  onPress={() => handleDelete(dispo?._id || '')}
                                />
                              </View>
                            )}
                          </TouchableOpacity>

                        );
                      })}
                    </View>
                  );
                })}

              </>
            ) : (
              <>
                <View style={styles.headerRow}>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Employees</Text>
                  <Text style={[styles.headerCell, { flex: 3 }]}>
                    {selectedDay?.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric' })}
                  </Text>
                </View>

                <View style={styles.dayView}>
                  {filteredEmployees.map((employee) => {
                    const shift = getEmployeeShiftForDay(employee._id, selectedDay || new Date());
                    const isSelected = selectedCell?.employeeId === employee._id && selectedCell?.date.toDateString() === (selectedDay || new Date()).toDateString();
                    const dispo = disponibilities.find(
                      (d) => d.employeeId === employee._id && new Date(d.selectedDay).toDateString() === (selectedDay || new Date()).toDateString()
                    );

                    return (
                      <View key={employee._id} style={styles.dayRow}>
                        <Text style={[styles.employeeCell, { flex: 2, marginLeft: 10 }]}>{employee.name} {employee.familyName} ({employee.scoreCard})</Text>
                        <TouchableOpacity
                          style={[styles.dayShiftCell, { backgroundColor: shift ? shift.color : '#ccc' }]}
                          onPress={(event) => handleCellPress(employee._id, selectedDay || new Date(), event)}
                        >
                          {dispo && dispo.decisions === 'accepted' && (
                            <Text style={styles.statusAccepted}>
                              {user?.language === 'English' ? 'Accepted' : 'Accepté'}
                            </Text>
                          )}
                          {dispo && dispo.decisions === 'rejected' && (
                            <Text style={styles.statusRejected}>
                              {user?.language === 'English' ? 'Rejected' : 'Rejeté'}
                            </Text>
                          )}
                          {dispo && dispo.decisions === 'pending' && <Text style={styles.statusPending}>?</Text>}



                          {isSelected && (
                            <View style={styles.iconContainer}>
                              <Icon name="checkmark-circle" size={24} color="green" onPress={() => handleAccept(employee._id, selectedDay || new Date())} />
                              <Icon name="close-circle" size={24} color="red" onPress={() => handleReject(employee._id, selectedDay || new Date())} />
                              <Icon name="trash" size={24} color="gray" onPress={() => handleDelete(dispo?._id || '')} />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>

          {showShiftPicker && (
            <Modal
              visible={true}
              animationType="fade"
              transparent={true}
              onRequestClose={() => setShowShiftPicker(null)}
            >
              <View style={styles.modalShiftPickerOverlay}>
                <View style={styles.modalShiftPickerContainer}>
                  <Text style={styles.modalShiftPickerTitle}>
                    {user?.language === 'English' ? 'Select a Shift' : 'Sélectionner un Quart'}
                  </Text>
                  <ScrollView
                    style={styles.modalShiftPickerScrollView}
                    contentContainerStyle={styles.modalShiftPickerScrollViewContent}
                  >
                    {shifts.length > 0 ? (
                      shifts.map((shift) => (
                        <TouchableOpacity
                          key={shift._id}
                          style={styles.modalShiftPickerItem}
                          onPress={() => handleShiftSelection(shift._id)}
                        >
                          <View
                            style={[styles.modalShiftPickerCircle, { backgroundColor: shift.color || '#000' }]}
                          />
                          <Text style={styles.modalShiftPickerText}>{shift.name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.modalShiftPickerNoShiftsText}>
                        {user?.language === 'English' ? 'No shifts available' : 'Aucun quart disponible'}
                      </Text>
                    )}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.modalShiftPickerCloseButton}
                    onPress={() => setShowShiftPicker(null)}
                  >
                    <Text style={styles.modalShiftPickerCloseButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}



        </>
      )}

      <Modal
        visible={isSummaryModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={toggleSummaryModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Weekly Dispos Summary' : 'Résumé des Dispos Hebdomadaires'}
            </Text>

            {/* ScrollView Vertical */}
            <ScrollView style={styles.modalVerticalScroll}>
              {/* ScrollView Horizontal */}
              <ScrollView horizontal style={styles.modalHorizontalScroll}>
                <View>
                  {/* Table Header */}
                  <View style={styles.modalTableRow}>
                    <Text style={[styles.modalTableCell, styles.modalHeaderCell]}>Shift Type</Text>
                    {currentWeekDates.map((date, index) => (
                      <Text key={index} style={[styles.modalTableCell, styles.modalHeaderCell]}>
                        {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                      </Text>
                    ))}
                  </View>

                  {/* Table Rows */}
                  {getWeeklyShiftSummary().map((summary, index) => (
                    <View key={index} style={styles.modalTableRow}>
                      <Text style={[styles.modalTableCell, { backgroundColor: summary.color, color: '#fff' }]}>
                        {summary.shiftName}
                      </Text>
                      {summary.daysSummary.map((daySummary, dayIndex) => (
                        <View key={dayIndex} style={styles.modalTableCell}>
                          <Text style={{ fontSize: 12 }}>
                            {user?.language === 'English' ? `Pending: ${daySummary.pending}` : `En attente: ${daySummary.pending}`}
                          </Text>
                          <Text style={{ fontSize: 12 }}>
                            {user?.language === 'English' ? `Accepted: ${daySummary.accepted}` : `Accepté: ${daySummary.accepted}`}
                          </Text>
                          <Text style={{ fontSize: 12 }}>
                            {user?.language === 'English' ? `Rejected: ${daySummary.rejected}` : `Rejeté: ${daySummary.rejected}`}
                          </Text>
                        </View>

                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </ScrollView>

            <TouchableOpacity onPress={toggleSummaryModal} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPredictionModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsPredictionModalVisible(false)}
      >
        <View style={styles.predictionModalContainer}>
          <View style={styles.predictionModalContent}>
            <Text style={styles.predictionModalTitle}>
              {user?.language === "English" ? "Shift Predictions" : "Prédictions des Shifts"}
            </Text>

            <ScrollView style={styles.predictionModalScrollView}>
              {Object.keys(predictedNeeds).map((dateStr) => (
                <View key={dateStr} style={styles.predictionModalDateSection}>
                  <Text style={styles.predictionModalDateTitle}>{dateStr}</Text>

                  {/* TITRES ALIGNÉS AVEC LES INPUTS */}
                  <View style={styles.predictionModalHeaders}>
                    <Text style={[styles.predictionModalHeaderText, { flex: 2 }]}>

                    </Text>
                    <Text style={[styles.predictionModalHeaderText, { flex: 1 }]}>
                      {user?.language === "English" ? "Number of Routes" : "Nombre de routes"}
                    </Text>
                    <Text style={[styles.predictionModalHeaderText, { flex: 1 }]}>
                      {user?.language === "English" ? "Extra Drivers" : "Conducteurs supplémentaires"}
                    </Text>
                  </View>

                  {Object.keys(predictedNeeds[dateStr]).map((shiftId) => {
                    const shift = shifts.find(s => s._id === shiftId);
                    if (!shift) return null;

                    return (
                      <View key={shiftId} style={styles.predictionModalShiftRow}>
                        <View style={[styles.predictionModalShiftColor, { backgroundColor: shift.color }]} />
                        <Text style={[styles.predictionModalShiftLabel, { flex: 2 }]}>{shift.name}</Text>

                        <TextInput
                          style={[styles.predictionModalInput, { flex: 1 }]}
                          keyboardType="numeric"
                          placeholder="0"
                          value={predictedNeeds[dateStr][shiftId].needed.toString()}
                          onChangeText={(value) => updatePredictedNeeds(dateStr, shiftId, "needed", value)}
                        />

                        <TextInput
                          style={[styles.predictionModalInput, { flex: 1 }]}
                          keyboardType="numeric"
                          placeholder="0"
                          value={predictedNeeds[dateStr][shiftId].extra.toString()}
                          onChangeText={(value) => updatePredictedNeeds(dateStr, shiftId, "extra", value)}
                        />
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.planningModeContainer}>
              <Text style={styles.planningModeTitle}>
                {user?.language === "English" ? "Select Planning Mode" : "Sélectionnez le Mode de Planification"}
              </Text>

              <View style={styles.planningModeRow}>
                {/* Strict Planning */}
                <TouchableOpacity
                  style={[styles.planningOption, planningMode === 'strict' && styles.selectedPlanningOption]}
                  onPress={() => { setPlanningMode('strict'); setErrorMessage(null); }}
                >
                  <Icon name={planningMode === 'strict' ? "checkbox" : "square-outline"} size={24} color="#001933" />
                  <Text style={styles.planningOptionText}>{user?.language === "English" ? "Strict" : "Stricte"}</Text>
                </TouchableOpacity>

                {/* Smart Planning */}
                <TouchableOpacity
                  style={[styles.planningOption, planningMode === 'smart' && styles.selectedPlanningOption]}
                  onPress={() => { setPlanningMode('smart'); setErrorMessage(null); }}
                >
                  <Icon name={planningMode === 'smart' ? "checkbox" : "square-outline"} size={24} color="#001933" />
                  <Text style={styles.planningOptionText}>{user?.language === "English" ? "Smart" : "Intelligent"}</Text>
                </TouchableOpacity>
              </View>

              {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
            </View>



            <View style={styles.predictionModalButtons}>
              <TouchableOpacity onPress={() => setIsPredictionModalVisible(false)} style={styles.predictionModalCancelButton}>
                <Text style={styles.predictionModalButtonText}>
                  {user?.language === "English" ? "Cancel" : "Annuler"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={submitPrediction}
                style={[styles.predictionModalSubmitButton, isPredicting && { backgroundColor: '#aaa' }]}
                disabled={isPredicting} // Désactive le bouton pendant le chargement
              >
                {isPredicting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.predictionModalButtonText}>
                    {user?.language === "English" ? "Submit" : "Envoyer"}
                  </Text>
                )}
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'affichage de la raison */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.reasonModalOverlay}>
          <View style={styles.reasonModalContent}>
            <Text style={styles.reasonModalTitle}>Raison du rejet</Text>
            <Text style={styles.reasonModalText}>{modalReasonText}</Text>

            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.reasonModalCloseButton}>
              <Text style={styles.reasonModalCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isMissingShiftsModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsMissingShiftsModalVisible(false)}
      >
        <View style={styles.missingShiftsModalContainer}>
          <View style={styles.missingShiftsModalContent}>
            <Text style={styles.missingShiftsModalTitle}>
              {user?.language === 'English' ? 'Missing Shifts' : 'Shifts Manquants'}
            </Text>

            <ScrollView style={styles.missingShiftsModalScrollView}>
              {Object.keys(missingShifts).length > 0 ? (
                Object.entries(missingShifts).map(([date, shiftList]) => (
                  <View key={date} style={styles.missingShiftsModalDateSection}>
                    <Text style={styles.missingShiftsModalDateTitle}>{date}</Text>

                    {shiftList.map((shift: any, index: number) => {
                      // 🔹 Correction : Vérifier que `shifts` contient bien les shifts avant de chercher
                      const shiftInfo = shifts.find((s: Shift) => String(s._id).trim() === String(shift.shiftId).trim());

                      // 🔹 Debugging si un shift est inconnu
                      if (!shiftInfo) {
                        console.warn(`⚠️ Shift not found: ${shift.shiftId} - Check your data!`);
                        console.log("Available shifts:", shifts); // 🔹 Vérifier que `shifts` contient les bonnes données
                      }

                      return (
                        <View key={index} style={styles.missingShiftsModalShiftRow}>
                          <Text style={styles.missingShiftsModalShiftText}>
                            {user?.language === 'English'
                              ? `Shift: ${shiftInfo ? shiftInfo.name : `Unknown (ID: ${shift.shiftId})`}`
                              : `Quart: ${shiftInfo ? shiftInfo.name : `Inconnu (ID: ${shift.shiftId})`}`}
                          </Text>
                          <Text style={styles.missingShiftsModalShiftText}>
                            {user?.language === 'English'
                              ? `Needed: ${shift.needed} | Accepted: ${shift.accepted} | Missing: ${shift.missing}`
                              : `Besoin: ${shift.needed} | Accepté: ${shift.accepted} | Manquant: ${shift.missing}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ))
              ) : (
                <Text style={styles.missingShiftsModalShiftText}>
                  {user?.language === 'English' ? 'No missing shifts' : 'Aucun shift manquant'}
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity onPress={() => setIsMissingShiftsModalVisible(false)} style={styles.missingShiftsModalCloseButton}>
              <Text style={styles.missingShiftsModalCloseButtonText}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>










    </View>
  );
};

export default EmployeesAvaibilities;

const styles = StyleSheet.create({

  planningModeContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  planningModeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#001933',
    textAlign: 'center',
  },
  planningModeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Espacement uniforme
    alignItems: 'center',
  },
  planningOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 10, // Espacement entre les cases
    flex: 1, // Ajuste la taille des éléments
    justifyContent: 'center',
  },
  selectedPlanningOption: {
    borderColor: '#001933',
    backgroundColor: '#e6f7ff',
  },
  planningOptionText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#001933',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 5,
  },

  missingShiftsButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    width: '30%', // Augmentez la largeur ici (par exemple, 50% de la largeur parent)
    alignSelf: 'center', // 
  },
  missingShiftsButtonGreen: {
    backgroundColor: 'green',
  },
  missingShiftsButtonRed: {
    backgroundColor: 'red',
  },
  missingShiftsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  missingShiftsModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Fond semi-transparent
  },
  missingShiftsModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  missingShiftsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933',
    textAlign: 'center',
    marginBottom: 15,
  },
  missingShiftsModalScrollView: {
    maxHeight: '70%',
    marginBottom: 20,
  },
  missingShiftsModalDateSection: {
    marginBottom: 15,
    paddingBottom: 10,
  },
  missingShiftsModalDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  missingShiftsModalShiftRow: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
  },
  missingShiftsModalShiftText: {
    fontSize: 14,
    color: '#001933',
  },
  missingShiftsModalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  missingShiftsModalCloseButton: {
    backgroundColor: '#001933',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  missingShiftsModalCloseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },

  reasonModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Overlay sombre
  },
  reasonModalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  reasonModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#001933',
  },
  reasonModalText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
  },
  reasonModalCloseButton: {
    backgroundColor: '#001933',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  reasonModalCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  reasonModalIconContainer: {
    position: 'absolute',
    top: 4,   // Ajustement parfait dans la cellule
    right: 4,  // Bien collé au bord droit
    backgroundColor: 'red',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
    zIndex: 20, // S'assurer qu'elle reste visible
    alignSelf: 'flex-end', // 🔹 Correction pour être à droite
  },
  reasonModalIconText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  reasonTouchable: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 25,  // 🔹 Rendre plus cliquable
    height: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },


  predictionModalHeaders: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingBottom: 5,
  },
  predictionModalHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#001933',
    textAlign: 'center',
  },
  predictionModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  predictionModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  predictionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001933',
    textAlign: 'center',
    marginBottom: 15,
  },
  predictionModalScrollView: {
    maxHeight: '70%',
    marginBottom: 20,
  },
  predictionModalDateSection: {
    marginBottom: 15,
    paddingBottom: 10,
  },
  predictionModalDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#003366',
    marginBottom: 8,
  },
  predictionModalShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 6,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  predictionModalShiftColor: {
    width: 15,
    height: 15,
    borderRadius: 50,
    marginRight: 10,
  },
  predictionModalShiftLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001933',
  },
  predictionModalInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textAlign: 'center',
    fontSize: 16,
    color: '#001933',
  },
  predictionModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  predictionModalCancelButton: {
    flex: 1,
    backgroundColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 10,
  },
  predictionModalSubmitButton: {
    flex: 1,
    backgroundColor: '#001933',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  predictionModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },



  unsavedChangesContainer: {
    backgroundColor: '#ffa500', // Fond rouge pour le bouton
    padding: 10,
    borderRadius: 8,
    width: '30%', // Augmentez la largeur ici (par exemple, 50% de la largeur parent)
    alignSelf: 'center', //
  },
  unsavedChangesText: {
    color: '#fff', // Bleu foncé pour le texte
    fontWeight: 'bold',
    textAlign: 'center',
  },

  navButton: {
    backgroundColor: '#001933', // Bouton bleu foncé
    borderRadius: 50, // Arrondi complet pour un bouton circulaire
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekLabelContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#001933', // Texte bleu foncé
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalVerticalScroll: {
    maxHeight: '70%', // Limite la hauteur verticale pour permettre le défilement vertical
    marginBottom: 16,
  },
  modalHorizontalScroll: {
    maxWidth: '100%', // Limite la largeur pour éviter le dépassement horizontal
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Overlay sombre
  },
  modalContent: {
    width: '95%',
    maxHeight: '80%', // Hauteur limitée pour le défilement si nécessaire
    backgroundColor: 'white', // Fond blanc
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#001933', // Texte bleu foncé
    textAlign: 'center',
  },
  modalTableContainer: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  modalTableRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 4,
  },
  modalTableCell: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 100,
    textAlign: 'center',
    backgroundColor: '#e6f7ff', // Fond bleu clair
    borderRadius: 6,
    marginHorizontal: 50,
  },
  modalHeaderCell: {
    backgroundColor: '#001933', // Fond bleu foncé
    color: '#fff', // Texte blanc
    fontWeight: 'bold',
    padding: 12,
    borderRadius: 6,
  },

  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#cccccc', // Fond gris clair
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalCloseButtonText: {
    color: '#000', // Texte noir
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  summaryButton: {
    flex: 1, // Prend une largeur égale aux autres boutons
    backgroundColor: '#ffa500', // Orange pour attirer l'attention
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryButtonText: {
    color: '#fff', // Texte blanc
    textAlign: 'center',
    fontWeight: 'bold',
  },
  shiftPickerContainer: {
    position: 'absolute',
    backgroundColor: 'white', // Fond blanc
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  shiftList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 10,
  },
  shiftItem: {
    marginRight: 10,
    marginBottom: 10,
  },
  shiftCircleModel: {
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: '#003366', // Bleu foncé pour le cercle
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white', // Fond blanc
  },
  header: {
    flexDirection: 'column',
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1, // Prend une largeur égale aux autres boutons
    backgroundColor: '#001933', // Bleu profond
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8, // Arrondi pour un style moderne
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3, // Ombre sur Android
  },
  resetButton: {
    flex: 1, // Prend une largeur égale aux autres boutons
    backgroundColor: '#001933', // Vert pour indiquer une action de réinitialisation
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resetButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  toggleButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
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
  weekControls: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Espacement uniforme entre les boutons
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12, // Ajoute de l'espace sur les côtés
    width: '100%', // Assure que la vue prend toute la largeur

  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  counterText: {
    color: '#001933', // Texte bleu foncé
    fontSize: 16,
    fontWeight: 'bold',


  },
  publishButton: {
    backgroundColor: '#001933', // Fond rouge pour le bouton
    padding: 10,
    borderRadius: 8,
    width: '30%', // Augmentez la largeur ici (par exemple, 50% de la largeur parent)
    alignSelf: 'center', // 
  },
  publishButtonText: {
    color: '#fff', // Texte blanc
    fontSize: 16,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  table: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white', // Fond blanc
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#001933', // Fond bleu foncé
    padding: 10,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerCell: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff', // Texte blanc
    textAlign: 'left',
  },
  row: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  employeeCell: {
    flex: 2,
    fontWeight: 'bold',
    color: '#001933', // Texte bleu foncé
    textAlign: 'left',
    minWidth: 50,
  },
  cell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
    borderRadius: 4,
    height: 40,
  },
  dayView: {
    backgroundColor: 'white', // Fond blanc
    borderRadius: 8,
  },
  dayShiftCell: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    height: 40,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
  },
  iconContainerWeek: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-around',
    width: '100%',
  },
  statusAccepted: {
    color: 'green',
    fontWeight: 'bold',
  },
  statusRejected: {
    color: 'red',
    fontWeight: 'bold',
  },
  statusPending: {
    color: '#ffffff', // Orange pour le statut en attente
    fontWeight: 'bold',
  },
  shiftColorsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginBottom: 16,
  },
  shiftCircleContainer: {
    alignItems: 'center',
    marginHorizontal: 10,
  },
  shiftCircle: {
    borderRadius: 10,
    marginBottom: 5,
    backgroundColor: '#001933', // Bleu foncé pour le cercle
  },
  shiftName: {
    color: '#001933', // Texte bleu foncé
  },
  modalShiftPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Overlay sombre pour le modal
  },
  modalShiftPickerContainer: {
    width: '85%',
    backgroundColor: '#ffffff', // Fond blanc pour le contenu
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10, // Ombre pour les appareils Android
  },
  modalShiftPickerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#001933', // Bleu foncé pour le titre
    marginBottom: 20,
    textAlign: 'center',
  },
  modalShiftPickerScrollView: {
    width: '100%',
    maxHeight: 200, // Limite la hauteur du ScrollView
    marginBottom: 20,
  },
  modalShiftPickerScrollViewContent: {
    paddingHorizontal: 10,
  },
  modalShiftPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9', // Fond gris clair
    padding: 12,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2, // Légère ombre
  },
  modalShiftPickerCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  modalShiftPickerText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#001933', // Texte bleu foncé
  },
  modalShiftPickerNoShiftsText: {
    fontSize: 16,
    color: 'red', // Texte rouge pour indiquer l'absence de shifts
    textAlign: 'center',
    marginTop: 20,
  },
  modalShiftPickerCloseButton: {
    backgroundColor: '#001933', // Bleu foncé pour le bouton
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 12,
  },
  modalShiftPickerCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff', // Texte blanc
    textAlign: 'center',
  },
});


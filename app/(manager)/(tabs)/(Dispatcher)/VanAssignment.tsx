import React, { useState, useEffect } from "react";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Platform, TextInput } from "react-native";
import axios from "axios";
import { MaterialIcons } from "@expo/vector-icons";
import AppURL from "@/components/src/URL";
import { useUser } from "@/context/UserContext";



type Vehicle = {
  _id: string;
  vehicleNumber: string;
  model: string;
  drivable: boolean;
  status: string;
  statusColor: string;
};

type ReportIssue = {
  _id: string;
  vanId: string;
  drivable: boolean;
  statusId: string;
};

type Status = {
  _id: string;
  name: string;
  location: string;
  color: string;
};

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
  confirmation: "confirmed" | "canceled";
  presence: "confirmed" | "rejected";
};
type Assignment = {
  _id: string;
  employeeId: string;
  vanId: string;
  date: string;
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

const URL_FLEET = `${AppURL}/api/vehicles/all`;
const URL_REPORT_ISSUES = `${AppURL}/api/reportIssues`;
const URL_STATUSES = `${AppURL}/api/statuses/all`;
const URL_EMPLOYEES = `${AppURL}/api/employee`;
const URL_DISPONIBILITE = `${AppURL}/api/disponibilites`;
const URL_SHIFTS = `${AppURL}/api/shifts`;
const URL_vanAssignmen = `${AppURL}/api/vanAssignments`;

const DrivableVansAndConfirmedEmployees = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [drivableVans, setDrivableVans] = useState<Vehicle[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [confirmedEmployees, setConfirmedEmployees] = useState<{ employee: Employee, shiftId: string }[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedVan, setSelectedVan] = useState<Vehicle | null>(null);
  const [assignments, setAssignments] = useState<{ employee: Employee; van: Vehicle; date: string }[]>([]);
  const [instructionText, setInstructionText] = useState<string | null>(null);
  const [flashVanList, setFlashVanList] = useState(false);
  const [autoAssignMessage, setAutoAssignMessage] = useState<string | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // New loading flag
  const [searchQuery, setSearchQuery] = useState(""); // Search state
  const [isAssigning, setIsAssigning] = useState(false); // Pour gérer l'état de chargement
  const [refreshing, setRefreshing] = useState(false); // État pour gérer le Pull to Refresh
  const [reportIssues, setReportIssues] = useState<ReportIssue[]>([]);


  const filterConfirmedEmployees = () => {
    return confirmedEmployees
      .filter(item =>
        item.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.employee.familyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        shifts.find(shift => shift._id === item.shiftId && shift.name.toLowerCase().includes(searchQuery.toLowerCase()))
      )
      .sort((a, b) => {
        const shiftA = shifts.find(shift => shift._id === a.shiftId)?.name || "";
        const shiftB = shifts.find(shift => shift._id === b.shiftId)?.name || "";
        return shiftA.localeCompare(shiftB); // Trier par ordre alphabétique des noms de shifts
      });
  };

  const renderSearchBar = () => (
    <View style={styles.searchBarContainer}>
      <TextInput
        style={styles.searchBar}
        placeholder={
          user?.language === 'English' ? ' 🔍 Search by Employee or Shift' : ' 🔍 Rechercher par Employé ou Plage horaire'
        }
        value={searchQuery}
        onChangeText={(text) => setSearchQuery(text)}
      />
    </View>
  );


  const formatDate = (date: Date) => {
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const monthsOfYear = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const dayOfWeek = daysOfWeek[date.getDay()];
    const month = monthsOfYear[date.getMonth()];
    const day = date.getDate().toString().padStart(2, "0");
    const year = date.getFullYear();

    return `${dayOfWeek} ${month} ${day} ${year}`;
  };

  const fetchData = async () => {
    setLoading(true); // Activer l'indicateur de chargement
    try {
      // Effectuer les appels API principaux en parallèle
      const [
        vehicleResponse,
        reportIssuesResponse,
        statusesResponse,
        shiftsResponse,
        employeeResponse,
        confirmedDisposResponse // Ajouter la requête pour les disponibilités confirmées
      ] = await Promise.all([
        axios.get(URL_FLEET, { params: { dsp_code: user?.dsp_code } }),
        axios.get(`${URL_REPORT_ISSUES}/all`, { params: { dsp_code: user?.dsp_code } }),
        axios.get(URL_STATUSES, { params: { dsp_code: user?.dsp_code } }),
        axios.get(`${URL_SHIFTS}/shifts`, { params: { dsp_code: user?.dsp_code } }),
        axios.get(URL_EMPLOYEES, { params: { dsp_code: user?.dsp_code } }),
        axios.get(`${URL_DISPONIBILITE}/presence/confirmed-by-day`, {
          params: {
            selectedDay: formatDate(selectedDate),
            dsp_code: user?.dsp_code,
          },
        }),
      ]);

      // Traiter les réponses
      const vehicles: Vehicle[] = vehicleResponse.data.data;
      const reportIssues: ReportIssue[] = reportIssuesResponse.data;
      setReportIssues(reportIssues); // Stockez reportIssues dans l'état
      const statusesData: Status[] = statusesResponse.data;
      const shiftsData: Shift[] = shiftsResponse.data;
      const employeesData: Employee[] = employeeResponse.data;
      const confirmedDispos: Disponibility[] = confirmedDisposResponse.data;

      // Préparer les véhicules drivable
      const drivableVehicles = vehicles
        .filter((vehicle) => reportIssues.some((issue) => issue.vanId === vehicle._id && issue.drivable === true))
        .map((vehicle) => {
          const relatedIssue = reportIssues.find((issue) => issue.vanId === vehicle._id);
          const vehicleStatus = relatedIssue
            ? statusesData.find((status) => status._id === relatedIssue.statusId)
            : null;
          return {
            ...vehicle,
            status: vehicleStatus ? vehicleStatus.name : "Unknown",
            statusColor: vehicleStatus ? vehicleStatus.color : "#d3d3d3",
          };
        });

      // Mapper les disponibilités confirmées aux employés
      const confirmedEmployeesList = confirmedDispos.map((dispo) => {
        const employee = employeesData.find((emp) => emp._id === dispo.employeeId);
        return {
          employee: employee || { _id: dispo.employeeId, name: "Unknown", familyName: "" }, // Utiliser "Unknown" si non trouvé
          shiftId: dispo.shiftId,
        };
      });

      // Mettre à jour les états
      setDrivableVans(drivableVehicles);
      setConfirmedEmployees(confirmedEmployeesList);
      setShifts(shiftsData);

      // Charger les assignations pour la date sélectionnée
      await fetchAssignmentsByDate();
    } catch (error: any) {
      if (error.response) {
        if (Platform.OS === 'web') {
          window.alert(
            user?.language === 'English'
              ? 'The requested data could not be found on the server.'
              : 'Les données demandées n’ont pas pu être trouvées sur le serveur.'
          );
        } else {
          Alert.alert(
            user?.language === 'English' ? 'Not Found' : 'Non trouvé',
            user?.language === 'English'
              ? 'The requested data could not be found on the server.'
              : 'Les données demandées n’ont pas pu être trouvées sur le serveur.'
          );
        }
      }
    } finally {
      setLoading(false); // Désactiver l'indicateur de chargement
    }
  };





  const getShiftColor = (shiftId: string): string => {
    const shift = shifts.find((s) => s._id === shiftId);
    return shift ? shift.color : "#ccc";
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const fetchAssignmentsByDate = async () => {
    try {
      const formattedDate = formatDate(selectedDate);
      const response = await axios.get(`${URL_vanAssignmen}/date/${formattedDate}`, {
        params: { dsp_code: user?.dsp_code }, // Add dsp_code here
      });
      const assignmentData: { employeeId: string; vanId: string; date: string }[] = response.data;

      // Vérification des données avant de procéder
      if (!confirmedEmployees.length || !drivableVans.length) {
        setAssignments([]); // Assure que les assignations sont vides
        return; // Stoppe l'exécution
      }

      // Logique de mappage des assignations si les données sont disponibles
      const assignmentsMap = new Map<string, { employee: Employee; van: Vehicle; date: string }>();
      assignmentData.forEach((assignment) => {
        const employee = confirmedEmployees.find(emp => emp.employee._id === assignment.employeeId)?.employee;
        const van = drivableVans.find(v => v._id === assignment.vanId);

        if (employee && van) {
          assignmentsMap.set(employee._id, { employee, van, date: formattedDate });
        }
      });

      // Transformation en tableau pour mettre à jour l'état
      const initialAssignments = Array.from(assignmentsMap.values());
      setAssignments(initialAssignments);
      updateDrivableVansForAssignments(initialAssignments);
    } catch (error) {
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Failed to fetch assignments for the selected date.'
            : 'Échec de la récupération des affectations pour la date sélectionnée.'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Error' : 'Erreur',
          user?.language === 'English'
            ? 'Failed to fetch assignments for the selected date.'
            : 'Échec de la récupération des affectations pour la date sélectionnée.'
        );
      }
    }
  };


  const updateDrivableVansForAssignments = (initialAssignments: { employee: Employee; van: Vehicle; date: string }[]) => {
    // Mark assigned vans as unavailable
    setDrivableVans((prevVans) =>
      prevVans.map((van) => ({
        ...van,
        statusColor: initialAssignments.some((a) => a.van._id === van._id) ? "#d3d3d3" : van.statusColor,
      }))
    );

    // Display assigned vans next to employees
    setConfirmedEmployees((prevEmployees) =>
      prevEmployees.map((employee) => {
        const assignedVan = initialAssignments.find((a) => a.employee._id === employee.employee._id);
        return assignedVan
          ? { ...employee, assignedVanNumber: assignedVan.van.vehicleNumber }
          : employee;
      })
    );
  };

  // First useEffect to load confirmedEmployees and drivableVans data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsDataLoaded(false);
      await fetchData();
      setIsDataLoaded(true);
      // Charger les assignations de la veille
    };

    fetchInitialData();
  }, [selectedDate]);



  const handleEmployeeSelect = (employee: Employee) => {
    if (selectedEmployee && selectedEmployee._id === employee._id) {
      const updatedAssignments = assignments.filter((assignment) =>
        !(assignment.employee._id === employee._id && assignment.date === formatDate(selectedDate))
      );

      const currentAssignment = assignments.find(
        (assignment) => assignment.employee._id === employee._id && assignment.date === formatDate(selectedDate)
      );

      if (currentAssignment) {
        setDrivableVans((prevVans) =>
          prevVans.map((van) =>
            van._id === currentAssignment.van._id
              ? { ...van, statusColor: currentAssignment.van.statusColor }
              : van



          )
        );
      }

      setAssignments(updatedAssignments);
      setSelectedEmployee(null);
      setInstructionText(null);
    } else {
      setSelectedEmployee(employee);
      setFlashVanList(true);
      setTimeout(() => setFlashVanList(false), 300);
    }
  };

  const handleVanSelect = (van: Vehicle) => {
    if (assignments.some((assignment) =>
      assignment.van._id === van._id && assignment.date === formatDate(selectedDate))
    ) {
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'This van is already assigned for the selected day.'
            : 'Ce van est déjà assigné pour la date sélectionnée.'
        );
      } else {
        Alert.alert(
          user?.language === 'English'
            ? 'This van is already assigned for the selected day.'
            : 'Ce van est déjà assigné pour la date sélectionnée.'
        );
      }

      return;
    }
    if (selectedEmployee && van) {
      const newAssignment = { employee: selectedEmployee, van, date: formatDate(selectedDate) };
      setAssignments([...assignments, newAssignment]);
      setDrivableVans(drivableVans.map((v) => ({
        ...v,
        statusColor: v._id === van._id ? "#d3d3d3" : v.statusColor,
      })));
      setInstructionText(null);
      setSelectedEmployee(null);
      setSelectedVan(null);
      if (Platform.OS === 'web') {
        window.alert(
          user?.language === 'English'
            ? 'Assignment completed successfully!'
            : 'Affectation terminée avec succès !'
        );
      } else {
        Alert.alert(
          user?.language === 'English' ? 'Success' : 'Succès',
          user?.language === 'English'
            ? 'Assignment completed successfully!'
            : 'Affectation terminée avec succès !'
        );
      }

    }
  };

  const fetchPreviousAssignments = async () => {
    try {
      const previousDate = new Date(selectedDate);
      previousDate.setDate(selectedDate.getDate() - 1); // Date de la veille
      const formattedDate = formatDate(previousDate);

      const response = await axios.get(`${URL_vanAssignmen}/date/${formattedDate}`, {
        params: { dsp_code: user?.dsp_code }, // Add dsp_code here
      });
      const previousAssignments: { employeeId: string; vanId: string; date: string }[] = response.data;

      return previousAssignments.reduce((acc, assignment) => {
        acc[assignment.employeeId] = assignment.vanId; // Map employé -> van
        return acc;
      }, {} as Record<string, string>); // Renvoie un dictionnaire des assignations de la veille
    } catch (error) {
      console.error("Error fetching previous assignments:", error);
      return {};
    }
  };


  const handleAutoAssign = async () => {
    // Récupérer les assignations de la veille
    const previousAssignments = await fetchPreviousAssignments();

    // Filtrer les employés confirmés et triés
    const filteredAndSortedEmployees = filterConfirmedEmployees();

    // Extraire uniquement les employés non assignés parmi ceux qui sont filtrés
    const unassignedEmployees = filteredAndSortedEmployees.filter(employee =>
      !assignments.some(a => a.employee._id === employee.employee._id && a.date === formatDate(selectedDate))
    );

    // Extraire uniquement les vans disponibles
    const availableVans = drivableVans.filter(van =>
      !assignments.some(a => a.van._id === van._id && a.date === formatDate(selectedDate))
    );

    // Si aucun employé ou van n'est disponible, afficher un message et arrêter la fonction
    if (unassignedEmployees.length === 0 || availableVans.length === 0) {
      const message = availableVans.length === 0
        ? (user?.language === 'English'
          ? "No available vans to assign."
          : "Aucun van disponible à attribuer.")
        : (user?.language === 'English'
          ? "All employees are already assigned."
          : "Tous les employés sont déjà assignés.");

      if (Platform.OS === "web") {
        setAutoAssignMessage(message);
      } else {
        Alert.alert(
          user?.language === 'English' ? "Auto-Assign Status" : "Statut de l'attribution automatique",
          message
        );
      }
      return;
    }


    // Créer les nouvelles assignations basées sur les listes triées et les préférences de la veille
    const newAssignments: { employee: Employee; van: Vehicle; date: string }[] = [];
    let remainingVans = [...availableVans];

    unassignedEmployees.forEach(employee => {
      // Vérifier si cet employé avait un van attribué hier
      const preferredVanId = previousAssignments[employee.employee._id];
      const preferredVan = remainingVans.find(van => van._id === preferredVanId);

      if (preferredVan) {
        // Si le van préféré est disponible, l'attribuer
        newAssignments.push({
          employee: employee.employee,
          van: preferredVan,
          date: formatDate(selectedDate),
        });
        // Retirer ce van des vans disponibles
        remainingVans = remainingVans.filter(van => van._id !== preferredVanId);
      } else if (remainingVans.length > 0) {
        // Sinon, attribuer le premier van disponible
        newAssignments.push({
          employee: employee.employee,
          van: remainingVans[0],
          date: formatDate(selectedDate),
        });
        // Retirer ce van des vans disponibles
        remainingVans.shift();
      }
    });

    // Ajouter les nouvelles assignations à l'état existant
    setAssignments([...assignments, ...newAssignments]);

    // Marquer les vans assignés comme indisponibles
    setDrivableVans(drivableVans.map(van => ({
      ...van,
      statusColor: newAssignments.some(a => a.van._id === van._id) ? "#d3d3d3" : van.statusColor,
    })));

    // Afficher un message de succès
    const successMessage = user?.language === 'English'
      ? `${newAssignments.length} employees have been assigned vans automatically.`
      : `${newAssignments.length} employés ont été assignés à des vans automatiquement.`;
    if (Platform.OS === "web") {
      setAutoAssignMessage(successMessage);
    } else {
      Alert.alert("Auto-Assign Success", successMessage);
    }

    // Réinitialiser le message automatique après un délai
    setTimeout(() => setAutoAssignMessage(null), 3000);
  };




  const showAlert = (title: string, message: string | undefined) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Fonction principale pour gérer la création ou mise à jour des assignations
  const handleAssign = async () => {
    setIsAssigning(true);
    const formattedDate = formatDate(selectedDate);

    const assignmentsForDate = assignments
      .filter((a) => a.date === formattedDate)
      .map((a) => {
        const relatedIssue = reportIssues.find((issue) => issue.vanId === a.van._id);
        return {
          employeeId: a.employee._id,
          vanId: a.van._id,
          date: a.date,
          statusId: relatedIssue?.statusId || null,
        };
      });

    try {
      for (const assignment of assignmentsForDate) {
        const { employeeId, vanId, date, statusId } = assignment;

        const response = await axios.get(`${URL_vanAssignmen}/date/${date}`, {
          params: { dsp_code: user?.dsp_code },
        });
        const existingAssignments = response.data as Array<{
          employeeId: string;
          vanId: string;
          date: string;
          statusId: string;
        }>;

        const existingAssignment = existingAssignments.find((a) => a.employeeId === employeeId);

        if (existingAssignment) {
          if (existingAssignment.vanId !== vanId || existingAssignment.statusId !== statusId) {
            await axios.put(
              `${URL_vanAssignmen}/assignments/${date}/${employeeId}`,
              { vanId, statusId },
              {
                headers: { "Content-Type": "application/json" },
                params: { dsp_code: user?.dsp_code },
              }
            );
          }
        } else {
          await axios.post(
            `${URL_vanAssignmen}/create`,
            { employeeId, vanId, date, statusId, dsp_code: user?.dsp_code },
            { headers: { "Content-Type": "application/json" } }
          );
        }
      }

      showAlert(
        user?.language === "English" ? "Success" : "Succès",
        user?.language === "English"
          ? "Assignments processed successfully."
          : "Affectations traitées avec succès."
      );
    } catch (error) {
      showAlert(
        user?.language === "English" ? "Error" : "Erreur",
        user?.language === "English"
          ? "Failed to process assignments."
          : "Échec du traitement des affectations."
      );
    } finally {
      setIsAssigning(false);
    }
  };




  const handleLongPress = async (employeeId: string) => {
    // Trouver l'assignation pour cet employé
    const assignment = assignments.find(
      (a) => a.employee._id === employeeId && a.date === formatDate(selectedDate)
    );

    if (!assignment) {
      showAlert(
        user?.language === 'English'
          ? "Error"
          : "Erreur",
        user?.language === 'English'
          ? "No assignment found for this employee."
          : "Aucune affectation trouvée pour cet employé."
      );
      return;
    }

    try {
      // Envoyer une requête DELETE pour supprimer l'assignation
      await axios.delete(
        `${URL_vanAssignmen}/delete/${assignment.employee._id}/${formatDate(selectedDate)}`,
        {
          params: { dsp_code: user?.dsp_code }, // Add dsp_code as a query parameter
        }
      );


      // Mettre à jour l'état local après la suppression
      setAssignments(assignments.filter(
        (a) => a.employee._id !== employeeId || a.date !== formatDate(selectedDate)
      ));

      setDrivableVans((prevVans) =>
        prevVans.map((van) => {
          if (van._id === assignment.van._id) {
            return {
              ...van,
              statusColor: assignment.van.statusColor, // Restaurer la couleur d'origine
            };
          }
          return van;
        })
      );

      showAlert(
        user?.language === 'English'
          ? "Success"
          : "Succès",
        user?.language === 'English'
          ? "Assignment removed successfully."
          : "Affectation supprimée avec succès."
      );
    } catch (error) {
      console.error("Error deleting assignment:", error);
      showAlert(
        user?.language === 'English'
          ? "Error"
          : "Erreur",
        user?.language === 'English'
          ? "Failed to delete the assignment."
          : "Échec de la suppression de l'affectation."
      );
    }
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

  const renderDrivableVans = () => {
    const heightStyle = Platform.OS === "web" ? { height: 400 } : {};

    return (
      <View style={[styles.tableContainer, styles.vanContainer]}>
        <Text style={styles.title}>Vehicules ({drivableVans.length})</Text>
        {Platform.OS === "web" ? (
          <ScrollView style={[heightStyle, flashVanList && { backgroundColor: "#001933" }]}>
            {drivableVans.map((item) => (
              <TouchableOpacity
                key={item._id}
                onPress={() => handleVanSelect(item)}
                disabled={item.statusColor === "#d3d3d3"}
              >
                <View style={[styles.card, { backgroundColor: item.statusColor }]}>
                  <Text style={styles.cardText}>{item.vehicleNumber} - {item.model}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={drivableVans}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleVanSelect(item)}
                disabled={item.statusColor === "#d3d3d3"}
              >
                <View style={[styles.card, { backgroundColor: item.statusColor }]}>
                  <Text style={styles.cardText}>
                    {item.vehicleNumber} - {item.model}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={[{ flex: 1 }, flashVanList && { backgroundColor: "#001933" }]}
          />
        )}
      </View>
    );
  };

  const renderConfirmedEmployees = () => {
    const filteredEmployees = filterConfirmedEmployees();
    const heightStyle = Platform.OS === "web" ? { height: 400 } : {};

    return (
      <View style={[styles.tableContainer, styles.employeeContainer]}>
        <Text style={styles.title}>Drivers ({filteredEmployees.length})</Text>
        {Platform.OS === "web" ? (
          <ScrollView style={heightStyle}>
            {filteredEmployees.map((item) => (
              <TouchableOpacity
                key={item.employee._id}
                onPress={() => handleEmployeeSelect(item.employee)}
                onLongPress={() => handleLongPress(item.employee._id)} // Appui long pour supprimer l'assignation
              >

                <View style={[styles.card, { backgroundColor: getShiftColor(item.shiftId) }]}>
                  <Text style={styles.cardText}>
                    {item.employee.name} {item.employee.familyName}
                    {assignments.find(a => a.employee._id === item.employee._id && a.date === formatDate(selectedDate))?.van?.vehicleNumber
                      ? ` - ${assignments.find(a => a.employee._id === item.employee._id && a.date === formatDate(selectedDate))?.van?.vehicleNumber}`
                      : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item.employee._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                key={item.employee._id}
                onPress={() => handleEmployeeSelect(item.employee)}
                onLongPress={() => handleLongPress(item.employee._id)} // Appui long pour supprimer l'assignation
              >
                <View style={[styles.card, { backgroundColor: getShiftColor(item.shiftId) }]}>
                  <Text style={styles.cardText}>
                    {item.employee.name} {item.employee.familyName}
                    {assignments.find(a => a.employee._id === item.employee._id && a.date === formatDate(selectedDate))?.van?.vehicleNumber
                      ? ` - ${assignments.find(a => a.employee._id === item.employee._id && a.date === formatDate(selectedDate))?.van?.vehicleNumber}`
                      : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            style={{ flex: 1 }}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateNavigation}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color="#ffff" />
        </TouchableOpacity>
        <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={styles.iconButton}>
          <MaterialIcons name="arrow-forward" size={24} color="#ffff" />
        </TouchableOpacity>
      </View>

      <View>{renderSearchBar()}</View>

      {/* Row for Assign, Auto-Assign, and Refresh buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.assignButton}
          onPress={handleAssign}
          disabled={isAssigning} // Désactive le bouton pendant le chargement
        >
          {isAssigning ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.assignButtonText}>
              {user?.language === 'English' ? 'Confirm' : 'Confirmer'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.autoAssignButton}
          onPress={handleAutoAssign}
        >
          <Text style={styles.autoAssignButtonText}>
            {user?.language === 'English' ? 'Auto-Assign' : 'auto Attribution'}
          </Text>
        </TouchableOpacity>

        {/* Bouton "Refaire" */}
      </View>
      {instructionText && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>{instructionText}</Text>
        </View>
      )}

      {autoAssignMessage && (
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>{autoAssignMessage}</Text>
        </View>
      )}

      <View style={styles.listContainer}>
        {renderConfirmedEmployees()}
        {renderDrivableVans()}
      </View>

    </View>
  );
};

export default DrivableVansAndConfirmedEmployees;

const styles = StyleSheet.create({
  refreshButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    width: 90, // Bouton plus petit
    marginHorizontal: 5, // Espacement entre les boutons
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 14, // Texte plus petit
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
    backgroundColor: "#ffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "600",
  },
  dateNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  iconButton: {
    padding: 10,
    backgroundColor: "#001933",
    borderRadius: 50,
  },
  dateText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  assignButton: {
    backgroundColor: "#001933",
    padding: 10,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  assignButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
  autoAssignButton: {
    backgroundColor: "#001933",
    padding: 10,
    borderRadius: 10,
    flex: 1,
  },
  autoAssignButtonText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: 18,
  },
  listContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    flex: 1,
  },
  tableContainer: {
    flex: 1,
    marginHorizontal: 2,
    padding: 5,
    backgroundColor: "#fff",
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  vanContainer: {
    backgroundColor: "#fff",
  },
  employeeContainer: {
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  card: {
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    elevation: 2,
  },
  cardText: {
    fontSize: 14,
    color: "#ffff",
    fontWeight: "bold",
  },
  instructionContainer: {
    backgroundColor: "#001933",
    padding: 10,
    marginVertical: 10,
    borderRadius: 8,
  },
  instructionText: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#ffff",
  },
});

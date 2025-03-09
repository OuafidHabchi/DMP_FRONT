import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { Platform } from 'react-native';
import { RefreshControl } from 'react-native'; // Import nécessaire pour Pull to Refresh
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

type Employee = {
    _id: string;
    name: string;
    familyName: string;
    scoreCard: string;
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
    decisions: string;
    shiftId: string;
    selectedDay: string;
    shiftColor: string;
    confirmation: string;
    presence?: 'confirmed' | 'rejected'; // Presence field that may or may not exist
    suspension?: boolean,
    seen?: boolean,

};

interface Confirmation {
    employeeId: string;
    selectedDay: string;
    shiftId: string;
    status: 'confirmed' | 'canceled';
}
type TimeCard = {
    employeeId: string;
    day: string;
    startTime?: string;
    endTime?: string;
};

const Confirmation: React.FC = () => {
    const { user, socket } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
    const [disponibilities, setDisponibilities] = useState<Disponibility[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [selectedDisponibilities, setSelectedDisponibilities] = useState<Record<string, 'confirmed' | 'canceled'>>({});
    const [editingDisponibility, setEditingDisponibility] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false); // Loading state
    const [currentWeekDates, setCurrentWeekDates] = useState<Date[]>([]);
    const [timeCards, setTimeCards] = useState<TimeCard[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [shiftDetails, setShiftDetails] = useState<
        { shiftName: string; accepted: number; rejected: number; pending: number }[]
    >([]);
    const [isPresenceModalVisible, setIsPresenceModalVisible] = useState(false);
    const [presenceDetails, setPresenceDetails] = useState<
        { shiftName: string; confirmed: number; rejected: number; pending: number }[]
    >([]);
    const [isSending, setIsSending] = useState(false); // Track button loading state
    const [refreshing, setRefreshing] = useState(false); // State pour gérer le "Pull to Refresh"
    const [employeeCache, setEmployeeCache] = useState<Record<string, Employee[]>>({});
    const [shiftCache, setShiftCache] = useState<Record<string, Shift[]>>({}); // Cache local pour les shifts
    const [searchQuery, setSearchQuery] = useState('');
    const [isGlobalModalVisible, setIsGlobalModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<'confirmations' | 'presence'>('confirmations');


    useEffect(() => {
        if (!socket) return; // Vérifie si le socket est connecté

        // 🔥 Écoute les mises à jour de présence en temps réel
        socket.on('presenceUpdated', (updatedPresence) => {
            setDisponibilities((prevDisponibilities) =>
                prevDisponibilities.map((dispo) =>
                    dispo._id === updatedPresence.disponibiliteId
                        ? { ...dispo, presence: updatedPresence.presence }
                        : dispo
                )
            );
        });

        // 🔥 Écoute les mises à jour de "seen" en temps réel
        socket.on('seenUpdated', (updatedSeen) => {
            setDisponibilities((prevDisponibilities) =>
                prevDisponibilities.map((dispo) =>
                    dispo._id === updatedSeen.disponibiliteId
                        ? { ...dispo, seen: updatedSeen.seen }
                        : dispo
                )
            );
        });

        // 🔥 Nettoyage lors du démontage du composant
        return () => {
            socket.off('presenceUpdated');
            socket.off('seenUpdated');
        };
    }, [socket]);





    const filteredDisponibilities = disponibilities.filter((dispo) => {
        const employee = employees.find((e) => e._id === dispo.employeeId);
        if (!employee) return false;
        return (
            employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            employee.familyName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    // Fonction de rafraîchissement
    const handleRefresh = async () => {
        setRefreshing(true); // Début du rafraîchissement
        try {
            await fetchAllData(); // Recharger les données
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false); // Fin du rafraîchissement
        }
    };

    const getWeekDates = (date: Date): Date[] => {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Aller au dimanche précédent

        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            return day;
        });
    };
    const calculateHoursWorked = (employeeId: string, date: Date): number => {
        const dayString = date.toDateString(); // Formater la date
        const timeCard = timeCards.find(
            (card) => card.employeeId === employeeId && card.day === dayString
        );

        if (timeCard && timeCard.startTime && timeCard.endTime) {
            const start = new Date(`1970-01-01T${timeCard.startTime}Z`);
            const end = new Date(`1970-01-01T${timeCard.endTime}Z`);
            let hoursWorked = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            if (hoursWorked > 5) {
                hoursWorked -= 0.5;
            }

            return hoursWorked > 0 ? hoursWorked : 0;
        }

        return 0; // Aucun horaire disponible pour ce jour
    };


    const fetchEmployees = async () => {
        if (!user?.dsp_code) {
            console.warn("fetchEmployees: Missing dsp_code");
            return;
        }

        // Vérifier si les employés sont déjà en cache
        if (employeeCache[user.dsp_code]) {
            setEmployees(employeeCache[user.dsp_code]);
            return;
        }

        try {
            const { data } = await axios.get(`${AppURL}/api/employee`, {
                params: { dsp_code: user.dsp_code },
            });

            setEmployees(data);

            // Mettre à jour le cache uniquement si dsp_code est bien défini
            setEmployeeCache((prev) => ({ ...prev, [user.dsp_code!]: data }));
        } catch (error: any) {
            console.error('Error fetching employees:', error.message);
        }
    };


    const fetchShifts = async () => {
        if (!user?.dsp_code) {
            console.warn("fetchShifts: Missing dsp_code");
            return;
        }

        // Vérifier si les shifts sont déjà en cache
        if (shiftCache[user.dsp_code]) {
            setShifts(shiftCache[user.dsp_code]);
            return;
        }

        try {
            const response = await axios.get(`${AppURL}/api/shifts/shifts`, {
                params: { dsp_code: user.dsp_code },
            });

            setShifts(response.data);

            // Mettre à jour le cache uniquement si dsp_code est bien défini
            setShiftCache((prev) => ({ ...prev, [user.dsp_code!]: response.data }));
        } catch (error) {
            console.error('Error fetching shifts:', error);
        }
    };

    const fetchAllData = async () => {
        setLoading(true); // Activer l'état de chargement
        try {
            // Exécuter les appels API en parallèle
            await Promise.all([
                fetchEmployees(),
                fetchShifts(),
                fetchDisponibilities(),
                fetchTimeCards(),
            ]);
            setCurrentWeekDates(getWeekDates(currentDate)); // Mettre à jour les dates de la semaine
        } catch (error) {
            console.error('Erreur lors du chargement des données:', error);
        } finally {
            setLoading(false); // Désactiver l'état de chargement
        }
    };



    useEffect(() => {
        fetchAllData(); // Recharger les données lorsque la date change
    }, [currentDate]);





    const calculateTotalWeeklyHours = (employeeId: string): number => {
        return currentWeekDates.reduce((total, date) => {
            return total + calculateHoursWorked(employeeId, date);
        }, 0); // Initialiser le total à 0
    };

    const fetchTimeCards = async () => {
        try {
            const response = await axios.get(`${AppURL}/api/timecards/timecards`, {
                params: {
                    dsp_code: user?.dsp_code, // Ajout du dsp_code
                },
            });
            setTimeCards(response.data); // Stocker les TimeCards dans l'état
        } catch (error) {
            console.error('Erreur lors de la récupération des TimeCards:', error);
        }
    };

    const formatDateToString = (date: Date): string => {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayOfWeek = daysOfWeek[date.getDay()];
        const day = String(date.getDate()).padStart(2, '0'); // Ajoute un zéro devant si le jour est à un chiffre
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${dayOfWeek} ${month} ${day} ${year}`;
    };

    const fetchDisponibilities = async () => {
        try {
            const formattedDate = formatDateToString(currentDate); // Formater la date au format nécessaire
            const response = await axios.get(`${AppURL}/api/disponibilites/byDate`, {
                params: {
                    selectedDay: formattedDate, // Passer la date comme paramètre
                    dsp_code: user?.dsp_code,    // Ajouter dsp_code si nécessaire
                },
            });

            // Si l'API effectue déjà le filtrage côté back-end (decisions === 'accepted'), on peut ignorer cette étape.
            // Sinon, appliquer ce filtre côté front comme ci-dessous.
            const disponibilites = response.data; // Utiliser directement les données reçues
            setDisponibilities(disponibilites); // Mettre à jour l'état avec les données reçues
        } catch (error: any) {
            // Vérification spécifique pour les erreurs 404 (aucune donnée trouvée)
            if (error.response && error.response.status === 404) {
                console.warn('No disponibilites found for the selected day.');
                setDisponibilities([]); // Réinitialiser l'état si aucune disponibilité n'est trouvée
            } else {
                // Autres erreurs (exemple : problèmes réseau ou serveur)
                console.error('Erreur lors de la récupération des disponibilités:', error.message);
            }
        }
    };



    const getEmployeeName = (employeeId: string): string => {
        const employee = employees.find((e) => e._id === employeeId);
        return employee ? `${employee.name} ${employee.familyName} - ${(employee.scoreCard)}` : 'Unknown';
    };

    const getShiftColor = (shiftId: string): string => {
        const shift = shifts.find((s) => s._id === shiftId);
        return shift ? shift.color : '#ccc'; // Default to grey if no shift found
    };

    const handleConfirm = (disponibilityId: string) => {
        setSelectedDisponibilities((prevState) => ({
            ...prevState,
            [disponibilityId]: 'confirmed',
        }));
        setEditingDisponibility(null); // Exit editing mode

    };

    const handleCancel = (disponibilityId: string) => {
        setSelectedDisponibilities((prevState) => ({
            ...prevState,
            [disponibilityId]: 'canceled',
        }));
        setEditingDisponibility(null); // Exit editing mode

    };

    const handleDayChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        setCurrentDate(newDate);
    };


    const sendBulkUpdates = async (confirmations: Confirmation[]): Promise<boolean> => {
        try {
            const response = await axios.post(`${AppURL}/api/disponibilites/updateDisponibilites/confirmation`, {
                confirmations,
                dsp_code: user?.dsp_code,
            });

            // Vérification du succès
            if (response?.status === 200 || response?.data?.success === true) {
                if (Platform.OS === 'web') {
                    alert(
                        user?.language === 'English'
                            ? 'The confirmations have been sent successfully!'
                            : 'Les confirmations ont été envoyées avec succès !'
                    );
                } else {
                    Alert.alert(
                        user?.language === 'English' ? 'Success' : 'Succès',
                        user?.language === 'English'
                            ? 'The confirmations have been sent successfully!'
                            : 'Les confirmations ont été envoyées avec succès !'
                    );
                }
                return true;
            } else {
                throw new Error('Failed to send updates.');
            }

        } catch (error) {
            console.error('Error in bulk updates:', error);

            const errorMessage = user?.language === 'English'
                ? 'An error occurred while sending confirmations.'
                : 'Une erreur est survenue lors de l\'envoi des confirmations.';


            if (Platform.OS === 'web') {
                alert(errorMessage);
            } else {
                Alert.alert(user?.language === 'English' ? 'Error' : 'Erreur', errorMessage);
            }

            return false;
        }
    };






    const handleSendUpdates = async () => {
        setIsSending(true); // Start loading

        // Préparer les données de confirmation
        const confirmations: Confirmation[] = Object.keys(selectedDisponibilities)
            .map((dispoId) => {
                const dispo = disponibilities.find((d) => d._id === dispoId);
                return {
                    employeeId: dispo?.employeeId || '',
                    selectedDay: dispo?.selectedDay || '',
                    shiftId: dispo?.shiftId || '',
                    status: selectedDisponibilities[dispoId],
                    seen: false
                };
            })
            .filter((confirmation) => confirmation.employeeId && confirmation.selectedDay && confirmation.shiftId); // 🔥 Filtrer ici

        // Envoyer les confirmations et vérifier le succès
        const isSuccess = await sendBulkUpdates(confirmations);

        if (isSuccess) {
            await fetchAllData(); // Recharger les données seulement si tout s'est bien passé
            setSelectedDisponibilities({}); // 🔥 Vider les décisions envoyées
        }

        setIsSending(false); // Arrêter le chargement dans tous les cas
    };



    const calculateShiftDetails = async () => {
        try {
            const details = shifts.map((shift) => {
                const accepted = disponibilities.filter(
                    (d) => d.shiftId === shift._id && d.confirmation === 'confirmed'
                ).length;
                const rejected = disponibilities.filter(
                    (d) => d.shiftId === shift._id && d.confirmation === 'canceled'
                ).length;
                const pending = disponibilities.filter(
                    (d) => d.shiftId === shift._id && !['confirmed', 'canceled'].includes(d.confirmation)
                ).length;

                return {
                    shiftName: shift.name,
                    accepted,
                    rejected,
                    pending,
                };
            });

            setShiftDetails(details); // Mettre à jour les détails des shifts
            setIsModalVisible(true); // Ouvrir le modal des détails
            await fetchAllData(); // Recharger toutes les données
        } catch (error) {
            console.error('Erreur lors du calcul des détails de shift:', error);
        }
    };


    const calculatePresenceDetails = async () => {
        const details = shifts.map((shift) => {
            const confirmed = disponibilities.filter(
                (d) =>
                    d.shiftId === shift._id &&
                    d.presence === 'confirmed' &&
                    d.confirmation === 'confirmed' // Ajout de la condition sur confirmation
            ).length;

            const rejected = disponibilities.filter(
                (d) =>
                    d.shiftId === shift._id &&
                    d.presence === 'rejected' &&
                    d.confirmation === 'confirmed' // Ajout de la condition sur confirmation
            ).length;

            const pending = disponibilities.filter(
                (d) =>
                    d.shiftId === shift._id &&
                    !['confirmed', 'rejected'].includes(d.presence || '') &&
                    d.confirmation === 'confirmed' // Ajout de la condition sur confirmation
            ).length;

            return {
                shiftName: shift.name,
                confirmed,
                rejected,
                pending,
            };
        });

        setPresenceDetails(details); // Save details to state
        setIsPresenceModalVisible(true); // Open presence modal

        // Recharger les données après calcul
        try {
            await fetchAllData(); // Recharger toutes les données disponibles
        } catch (error) {
            console.error('Error while fetching data after calculating presence details:', error);
        }
    };

    const scorePriority = {
        Fantastic: 1,
        Great: 2,
        Fair: 3,
        Poor: 4,
        'New DA': 5,
    };


    const sortDisponibilitiesByShiftAndScore = (disponibilities: Disponibility[]) => {
        return disponibilities.sort((a, b) => {
            const shiftA = shifts.find((shift) => shift._id === a.shiftId)?.name || '';
            const shiftB = shifts.find((shift) => shift._id === b.shiftId)?.name || '';

            // Si les shifts sont identiques, trier par scoreCard
            if (shiftA === shiftB) {
                const employeeA = employees.find((employee) => employee._id === a.employeeId);
                const employeeB = employees.find((employee) => employee._id === b.employeeId);

                // Vérification explicite de la validité des scoreCards
                const scoreA = employeeA && employeeA.scoreCard in scorePriority
                    ? scorePriority[employeeA.scoreCard as keyof typeof scorePriority]
                    : Infinity;

                const scoreB = employeeB && employeeB.scoreCard in scorePriority
                    ? scorePriority[employeeB.scoreCard as keyof typeof scorePriority]
                    : Infinity;

                return scoreA - scoreB; // Compare by numeric priority
            }

            // Sinon, trier par shift
            return shiftA.localeCompare(shiftB);
        });
    };

    const renderPresenceIcon = (dispo: Disponibility) => {
        // Si `seen` n'existe pas, afficher ?
        if (typeof dispo.seen === 'undefined') {
            return (
                <Icon name="help-circle-outline" size={24} color="grey" />
            );
        }

        // Si `seen` existe mais `presence` n'existe pas
        if (typeof dispo.presence === 'undefined') {
            return (
                <FontAwesome
                    name={dispo.seen ? "eye" : "eye-slash"}
                    size={18}
                    color={dispo.seen ? "#2ecc71" : "#e74c3c"} // 🟢 Vert pour vu, 🔴 Rouge pour non vu
                />
            );
        }

        // Si `presence` existe, afficher l'icône correspondante
        if (dispo.presence === 'confirmed') {
            return <Icon name="checkmark-circle-outline" size={24} color="blue" />;
        } else if (dispo.presence === 'rejected') {
            return <Icon name="close-circle-outline" size={24} color="red" />;
        } else {
            return <Icon name="help-circle-outline" size={24} color="grey" />;
        }
    };




    useEffect(() => {
        const initializeData = async () => {
            setLoading(true); // Start loading
            try {
                await fetchAllData();
            } catch (error) {
                console.error('Error initializing data:', error);
            } finally {
                setLoading(false); // Stop loading
            }
        };

        initializeData();
    }, []); // Run on component mount

    // Rendering the loading component when data is being fetched

    return (

        <>
            {(loading) ? (
                // Si `loading` est vrai ou que les données ne sont pas encore prêtes, affichez un indicateur de chargement
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#001933" />
                    <Text style={styles.loadingText}>
                        {user?.language === 'English' ? 'Loading data...' : 'Chargement des données...'}
                    </Text>
                </View>
            ) : (

                <View style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => handleDayChange('prev')} style={styles.dayButton}>
                            <Icon name="arrow-back-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerText}>{currentDate.toDateString()}</Text>
                        <TouchableOpacity onPress={() => handleDayChange('next')} style={styles.dayButton}>
                            <Icon name="arrow-forward-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.searchBarContainer}>
                        <TextInput
                            style={styles.searchBar}
                            placeholder={user?.language === 'English' ? ' 🔍 Search employees...' : ' 🔍 Rechercher des employés...'}
                            placeholderTextColor="#aaa"
                            value={searchQuery}
                            onChangeText={(text) => setSearchQuery(text)}
                        />
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.globalViewButton}
                            onPress={async () => {
                                await calculateShiftDetails();
                                await calculatePresenceDetails();
                                setIsGlobalModalVisible(true);
                            }}
                        >
                            <Text style={styles.globalViewButtonText}>
                                {user?.language === 'English' ? 'Global View' : 'Vue Globale'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleSendUpdates}
                            style={[styles.sendButton, isSending && { opacity: 0.7 }]} // Add visual effect for loading
                            disabled={isSending} // Disable button while loading
                        >
                            {isSending ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.sendButtonText}>
                                    {user?.language === 'English' ? 'Send Confirmations' : 'Envoyer les Confirmations'}
                                </Text>

                            )}
                        </TouchableOpacity>

                    </View>



                    <ScrollView style={styles.table}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                        }>
                        <View style={styles.row}>
                            <Text style={[styles.headerCell, { flex: 2 }]}>
                                {user?.language === 'English' ? 'Driver' : 'Chauffeur'}
                            </Text>
                            <Text style={styles.headerCell}>
                                {user?.language === 'English' ? 'Disponibility' : 'Disponibilité'}
                            </Text>
                            <Text style={styles.headerCell}>
                                {user?.language === 'English' ? 'Presence' : 'Présence'}
                            </Text>

                        </View>
                        {sortDisponibilitiesByShiftAndScore(filteredDisponibilities).map((dispo) => (
                            <View key={dispo._id} style={styles.row}>
                                <Text style={[styles.employeeCell, { flex: 2 }]}>
                                    {getEmployeeName(dispo.employeeId)}{' '}
                                    <Text
                                        style={{
                                            color:
                                                calculateTotalWeeklyHours(dispo.employeeId) > 40
                                                    ? 'red'
                                                    : calculateTotalWeeklyHours(dispo.employeeId) > 30
                                                        ? 'orange'
                                                        : 'black', // Couleur par défaut
                                        }}
                                    >
                                        ({calculateTotalWeeklyHours(dispo.employeeId).toFixed(2)} h)
                                    </Text>
                                    {/* Affichez ⚠️ si suspension est true */}
                                    {dispo.suspension && (
                                        <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 20 }}> ⚠️</Text>
                                    )}
                                </Text>

                                <TouchableOpacity
                                    style={[styles.cell, { backgroundColor: getShiftColor(dispo.shiftId) }]}
                                    onPress={() => {
                                        if (editingDisponibility === dispo._id) {
                                            setEditingDisponibility(null);
                                        } else {
                                            setEditingDisponibility(dispo._id);
                                        }
                                    }}
                                >
                                    <View style={styles.iconContainer}>
                                        {editingDisponibility === dispo._id ? (
                                            <>
                                                <TouchableOpacity onPress={() => handleConfirm(dispo._id)}>
                                                    <Icon name="checkmark-circle" size={24} color="green" />
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleCancel(dispo._id)}>
                                                    <Icon name="close-circle" size={24} color="red" />
                                                </TouchableOpacity>
                                            </>
                                        ) : selectedDisponibilities[dispo._id] === 'confirmed' ? (
                                            <Icon name="checkmark-circle" size={24} color="green" />
                                        ) : selectedDisponibilities[dispo._id] === 'canceled' ? (
                                            <Icon name="close-circle" size={24} color="red" />
                                        ) : dispo.confirmation === 'confirmed' ? (
                                            <Icon name="checkmark-circle" size={24} color="green" />
                                        ) : dispo.confirmation === 'canceled' ? (
                                            <Icon name="close-circle" size={24} color="red" />
                                        ) : (
                                            <Text style={styles.pendingText}>Pending</Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.cell}>{renderPresenceIcon(dispo)}</View>
                            </View>
                        ))}
                    </ScrollView>



                    <Modal
                        visible={isGlobalModalVisible}
                        animationType="slide"
                        transparent={true}
                        onRequestClose={() => setIsGlobalModalVisible(false)}
                    >
                        <View style={styles.summaryModalOverlay}>
                            <View style={styles.summaryModalContainer}>

                                {/* Tabs pour naviguer entre Confirmations et Presence */}
                                <View style={styles.tabsContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.tab,
                                            activeTab === 'confirmations' && styles.activeTab,
                                        ]}
                                        onPress={() => setActiveTab('confirmations')}
                                    >
                                        <Text style={styles.tabText}>
                                            {user?.language === 'English' ? 'Confirmations' : 'Confirmations'}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.tab,
                                            activeTab === 'presence' && styles.activeTab,
                                        ]}
                                        onPress={() => setActiveTab('presence')}
                                    >
                                        <Text style={styles.tabText}>
                                            {user?.language === 'English' ? 'Presence' : 'Présence'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Contenu du Modal selon le tab actif */}
                                <ScrollView style={styles.summaryModalScrollView}>
                                    {activeTab === 'confirmations' ? (
                                        shiftDetails.map((shift, index) => (
                                            <View
                                                key={index}
                                                style={[
                                                    styles.summaryModalCard,
                                                    { backgroundColor: shifts.find((s) => s.name === shift.shiftName)?.color || '#f9f9f9' },
                                                ]}
                                            >
                                                <Text style={styles.summaryModalShiftName}>{shift.shiftName}</Text>
                                                <View style={styles.summaryModalStatusRow}>
                                                    <Text style={[styles.summaryModalStatusText, styles.summaryModalAccepted]}>
                                                        {user?.language === 'English' ? 'Confirmed:' : 'Confirmé :'}{' '}
                                                        <Text style={{ color: '#ffff' }}>{shift.accepted}</Text>
                                                    </Text>
                                                    <Text style={[styles.summaryModalStatusText, styles.summaryModalRejected]}>
                                                        {user?.language === 'English' ? 'Canceled:' : 'Annulé :'}{' '}
                                                        <Text style={{ color: '#ffff' }}>{shift.rejected}</Text>
                                                    </Text>
                                                    <Text style={[styles.summaryModalStatusText, styles.summaryModalPending]}>
                                                        {user?.language === 'English' ? 'Pending:' : 'En attente :'}{' '}
                                                        <Text style={{ color: '#ffff' }}>{shift.pending}</Text>
                                                    </Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        presenceDetails.map((shift, index) => (
                                            <View
                                                key={index}
                                                style={[
                                                    styles.presenceModalCard,
                                                    { backgroundColor: shifts.find((s) => s.name === shift.shiftName)?.color || '#f9f9f9' },
                                                ]}
                                            >
                                                <Text style={styles.presenceModalShiftName}>{shift.shiftName}</Text>
                                                <View style={styles.presenceModalStatusRow}>
                                                    <Text style={[styles.presenceModalStatusText, styles.presenceModalConfirmed]}>
                                                        {user?.language === 'English' ? 'Confirmed:' : 'Confirmé :'}{' '}
                                                        <Text style={{ color: '#fff' }}>{shift.confirmed}</Text>
                                                    </Text>
                                                    <Text style={[styles.presenceModalStatusText, styles.presenceModalRejected]}>
                                                        {user?.language === 'English' ? 'Rejected:' : 'Rejeté :'}{' '}
                                                        <Text style={{ color: '#fff' }}>{shift.rejected}</Text>
                                                    </Text>
                                                    <Text style={[styles.presenceModalStatusText, styles.presenceModalPending]}>
                                                        {user?.language === 'English' ? 'Pending:' : 'En attente :'}{' '}
                                                        <Text style={{ color: '#fff' }}>{shift.pending}</Text>
                                                    </Text>
                                                </View>
                                            </View>
                                        ))
                                    )}
                                </ScrollView>

                                <TouchableOpacity
                                    style={styles.summaryModalCloseButton}
                                    onPress={() => setIsGlobalModalVisible(false)}
                                >
                                    <Text style={styles.summaryModalCloseButtonText}>
                                        {user?.language === 'English' ? 'Close' : 'Fermer'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>




                </View>
            )}
        </>
    );
};

export default Confirmation;

const styles = StyleSheet.create({
    globalViewButton: {
        flex: 1,
        backgroundColor: '#001933', // Bleu simple
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    globalViewButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    sendButton: {
        flex: 1,
        backgroundColor: 'red', // Vert simple
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },

    tabsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        padding: 10,
        borderBottomWidth: 2,
        borderColor: '#ccc',
        alignItems: 'center',
    },
    activeTab: {
        borderColor: '#001933',
    },
    tabText: {
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
    presenceModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    presenceModalContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '90%',
        maxHeight: '80%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        alignItems: 'center',
    },
    presenceModalHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001933',
        marginBottom: 16,
        textAlign: 'center',
    },
    presenceModalScrollView: {
        width: '100%',
        marginBottom: 16,
    },
    presenceModalCard: {
        padding: 16,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    presenceModalShiftName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001933',
        marginBottom: 8,
    },
    presenceModalStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    presenceModalStatusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#001933',
    },
    presenceModalConfirmed: {
        color: '#001933',
    },
    presenceModalRejected: {
        color: '#001933',
    },
    presenceModalPending: {
        color: '#001933',
    },
    presenceModalCloseButton: {
        backgroundColor: '#001933',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presenceModalCloseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Space between the buttons
        alignItems: 'center',
        marginBottom: 16,
        gap: 10, // Space between buttons (use if supported)
        width: '100%',
    },

    summaryModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
    },
    summaryModalContainer: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 12,
        width: '90%',
        maxHeight: '80%', // Prevent overflow
        elevation: 10, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        alignItems: 'center',
    },
    summaryModalHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001933',
        marginBottom: 16,
        textAlign: 'center',
    },
    summaryModalScrollView: {
        width: '100%',
        marginBottom: 16,
    },
    summaryModalCard: {
        padding: 16,
        borderRadius: 10,
        marginBottom: 12,
        elevation: 3, // Shadow for Android
        shadowColor: '#000', // Shadow for iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    summaryModalShiftName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#001933', // Ensure text is readable on dark backgrounds
        marginBottom: 8,
    },
    summaryModalStatusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryModalStatusText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#001933', // Ensure text is readable on dark backgrounds
    },
    summaryModalAccepted: {
        color: '#001933', // Green for Accepted
    },
    summaryModalRejected: {
        color: '#001933', // Red for Rejected
    },
    summaryModalPending: {
        color: '#001933', // Yellow for Pending
    },
    summaryModalCloseButton: {
        backgroundColor: '#001933',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryModalCloseButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffff',

    },
    loadingText: {
        marginTop: 10,
        color: "#001933",
        fontSize: 16,
        fontWeight: 'bold',
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#ffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dayButton: {
        padding: 10,
        backgroundColor: '#001933', // Green button color for navigation
        borderRadius: 50, // Fully rounded
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 5, // Add shadow for better look
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    headerText: {
        color: '#001933',
        fontSize: 16,
        fontWeight: 'bold',
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: '#001933',
        padding: 10,
        borderRadius: 8,
        flexWrap: 'wrap',
        maxHeight: 70,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 25,
        marginBottom: 8,
    },
    shiftCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 10,
    },
    summaryText: {
        fontSize: 14,
        color: '#ffff',
        fontWeight: 'bold',
    },
    table: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#001933',
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    row: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#001933',
    },
    headerCell: {
        flex: 1,
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: '#001933',
        textAlign: 'center',
        paddingVertical: 8,
    },
    employeeCell: {
        flex: 1,
        fontWeight: 'bold',
        color: '#001933',
        textAlign: 'left',
    },
    cell: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
    },
    pendingText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
    counterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
});

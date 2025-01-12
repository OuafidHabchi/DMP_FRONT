import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Alert, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

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

const WeeklyRecapFleet = () => {
    const route = useRoute();
    const { user } = route.params as { user: User };
    type Vehicle = { _id: string; vehicleNumber: string; model: string; drivable: boolean; status: string; statusColor: string; };
    type ReportIssue = { _id: string; vanId: string; drivable: boolean; statusId: string; };
    type Status = { _id: string; name: string; location: string; color: string; };
    type Employee = { _id: string; name: string; familyName: string; };
    type Shift = { _id: string; name: string; starttime: string; endtime: string; color: string; };
    type Disponibility = { _id: string; employeeId: string; shiftId: string; confirmation: 'confirmed' | 'canceled'; presence: 'confirmed' | 'rejected'; };

    const URL_FLEET = 'https://coral-app-wqv9l.ondigitalocean.app/api/vehicles/all';
    const URL_REPORT_ISSUES = 'https://coral-app-wqv9l.ondigitalocean.app/api/reportIssues/all';
    const URL_STATUSES = 'https://coral-app-wqv9l.ondigitalocean.app/api/statuses/all';
    const URL_EMPLOYEES = 'https://coral-app-wqv9l.ondigitalocean.app/api/employee';
    const URL_DISPONIBILITE = 'https://coral-app-wqv9l.ondigitalocean.app/api/disponibilites/disponibilites';
    const URL_SHIFTS = 'https://coral-app-wqv9l.ondigitalocean.app/api/shifts/shifts';
    const URL_vanAssignmen = 'https://coral-app-wqv9l.ondigitalocean.app/api/vanAssignments';

    const [drivableVans, setDrivableVans] = useState<Vehicle[]>([]);
    const [confirmedEmployees, setConfirmedEmployees] = useState<{ employee: Employee, shiftId: string }[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [assignments, setAssignments] = useState<{
        drivable: boolean; employeeId: string; vanId: string; date: string
    }[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [reportIssues, setReportIssues] = useState<ReportIssue[]>([]); // Ajout de l'état manquant



    const formatDate = (date: Date) => {
        const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const dayOfWeek = daysOfWeek[date.getDay()];
        const month = monthsOfYear[date.getMonth()];
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${dayOfWeek} ${month} ${day} ${year}`;
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [vehicleResponse, reportIssuesResponse, statusesResponse, employeeResponse, shiftsResponse] = await Promise.all([
                axios.get(`${URL_FLEET}?dsp_code=${user.dsp_code}`),
                axios.get(`${URL_REPORT_ISSUES}?dsp_code=${user.dsp_code}`),
                axios.get(`${URL_STATUSES}?dsp_code=${user.dsp_code}`),
                axios.get(`${URL_EMPLOYEES}?dsp_code=${user.dsp_code}`),
                axios.get(`${URL_SHIFTS}?dsp_code=${user.dsp_code}`)
            ]);

            const vehicles: Vehicle[] = vehicleResponse.data.data;
            const reportIssues: ReportIssue[] = reportIssuesResponse.data;
            const statusesData: Status[] = statusesResponse.data;

            const drivableVehicles = vehicles
                .filter(vehicle => reportIssues.some(issue => issue.vanId === vehicle._id))
                .map(vehicle => {
                    const relatedIssue = reportIssues.find(issue => issue.vanId === vehicle._id);
                    const vehicleStatus = statusesData.find(status => status._id === relatedIssue?.statusId);
                    return { ...vehicle, status: vehicleStatus ? vehicleStatus.name : 'Unknown', statusColor: vehicleStatus ? vehicleStatus.color : '#d3d3d3' };
                });

            const employeesData: Employee[] = employeeResponse.data;
            const confirmedEmployeesList: { employee: Employee, shiftId: string }[] = [];

            for (const employee of employeesData) {
                const dispoResponse = await axios.get(`${URL_DISPONIBILITE}/employee/${employee._id}/day/${formatDate(selectedDate)}?dsp_code=${user.dsp_code}`);
                const disponibilites: Disponibility[] = dispoResponse.data;

                const confirmedDispo = disponibilites.find(dispo => dispo.confirmation === 'confirmed' && dispo.presence === 'confirmed');
                if (confirmedDispo) {
                    confirmedEmployeesList.push({ employee, shiftId: confirmedDispo.shiftId });
                }
            }

            setDrivableVans(drivableVehicles);
            setConfirmedEmployees(confirmedEmployeesList);
            setShifts(shiftsResponse.data);
            setReportIssues(reportIssuesResponse.data); // Enregistrer les reportIssues
        } catch (error: any) {
            console.error('Error fetching data:', error);
            Alert.alert('Erreur de chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignmentsByDate = async () => {
        try {
            const formattedDate = formatDate(selectedDate);
            const response = await axios.get(`${URL_vanAssignmen}/date/${formattedDate}?dsp_code=${user.dsp_code}`);
            setAssignments(response.data);
        } catch (error) {
            console.error('Erreur de récupération des assignements:', error);
            Alert.alert('Erreur', 'Échec de la récupération des assignements pour la date sélectionnée.');
        }
    };

    useEffect(() => {
        fetchData();
        fetchAssignmentsByDate();
    }, [selectedDate]);


    const renderVansWithStatus = () => {
        // Calculer les statistiques
        const totalVans = drivableVans.length;
        const drivableVansCount = drivableVans.filter((van) =>
            reportIssues.some((issue: { vanId: string; drivable: any; }) => issue.vanId === van._id && issue.drivable)
        ).length;


        const filteredVans = drivableVans.filter((van) => {
            const assignment = assignments.find(a => a.vanId === van._id);
            const assignedEmployee = assignment ? confirmedEmployees.find(e => e.employee._id === assignment.employeeId) : null;

            return (
                van.vehicleNumber.includes(searchQuery) ||
                van.model.includes(searchQuery) ||
                (assignedEmployee &&
                    (assignedEmployee.employee.name.includes(searchQuery) ||
                        assignedEmployee.employee.familyName.includes(searchQuery)))
            );
        });

        return (
            <View style={styles.listContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder={user.language === 'English' ? 'Search by van , model, or DA' : 'Rechercher par van, modèle ou DA'}
                    value={searchQuery}
                    onChangeText={(text) => setSearchQuery(text)}
                />

                {/* Statistiques */}
                <View style={styles.statsContainer}>
                    <Text style={styles.statsText}>
                        {user.language === 'English' ? `Total Vans: ${totalVans}` : `Total des Vans: ${totalVans}`}
                    </Text>
                    <Text style={styles.statsText}>
                        {user.language === 'English' ? `Drivable: ${drivableVansCount}` : `Conduisibles: ${drivableVansCount}`}
                    </Text>
                </View>


                {Platform.OS === 'web' ? (
                    <ScrollView style={{ height: 400 }}>
                        {filteredVans.map((van) => {
                            const assignment = assignments.find(a => a.vanId === van._id);
                            const assignedEmployee = assignment ? confirmedEmployees.find(e => e.employee._id === assignment.employeeId) : null;

                            return (
                                <TouchableOpacity key={van._id}>
                                    <View style={[styles.card, { backgroundColor: van.statusColor }]}>
                                        <Text style={styles.cardText}>
                                            {van.vehicleNumber}  ({van.status})
                                        </Text>
                                        {assignedEmployee && (
                                            <Text style={styles.assignedEmployeeText}>
                                                DA : {assignedEmployee.employee.name} {assignedEmployee.employee.familyName}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                ) : (
                    <FlatList
                        data={filteredVans}
                        keyExtractor={(item) => item._id}
                        renderItem={({ item: van }) => {
                            const assignment = assignments.find(a => a.vanId === van._id);
                            const assignedEmployee = assignment ? confirmedEmployees.find(e => e.employee._id === assignment.employeeId) : null;

                            return (
                                <TouchableOpacity>
                                    <View style={[styles.card, { backgroundColor: van.statusColor }]}>
                                        <Text style={styles.cardText}>
                                            {van.vehicleNumber} ({van.status})
                                        </Text>
                                        {assignedEmployee && (
                                            <Text style={styles.assignedEmployeeText}>
                                                DA : {assignedEmployee.employee.name} {assignedEmployee.employee.familyName}
                                            </Text>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        }}
                        style={{ flex: 1 }}
                    />
                )}
            </View>
        );
    };



    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#001933" />
                <Text style={styles.loadingText}>Loading data...</Text>
            </View>
        );
    }

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
            {renderVansWithStatus()}
        </View>
    );
};

export default WeeklyRecapFleet;

const styles = StyleSheet.create({

    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#001933',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statsText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#001933',
    },

    container: {
        flex: 1,
        padding: 20,
        backgroundColor: 'white' // Arrière-plan blanc
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white' // Arrière-plan blanc pour le conteneur de chargement
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '600',
        color: '#001933' // Texte bleu foncé
    },
    dateNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
    },
    iconButton: {
        padding: 10,
        borderRadius: 50,
        backgroundColor: '#001933' // Bleu foncé pour les boutons icônes
    },
    dateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001933' // Texte bleu foncé
    },
    listContainer: {
        flex: 1
    },
    card: {
        padding: 20,
        marginVertical: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    cardText: {
        fontSize: 16,
        color: '#001933', // Texte bleu foncé pour les cartes
        fontWeight: 'bold'
    },
    searchInput: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        height: 50,
        borderWidth: 1,
        borderColor: '#001933',
        color: '#2c3e50',
        fontSize: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    assignedEmployeeText: {
        fontSize: 14,
        color: '#ffff', // Texte bleu foncé
        marginTop: 5,
        fontWeight: 'bold'
    },
});

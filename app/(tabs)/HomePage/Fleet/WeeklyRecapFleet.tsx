import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, ScrollView, Platform, TextInput } from 'react-native';
import axios from 'axios';
import { MaterialIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import AppURL from '@/components/src/URL';

type User = {
    _id: string;
    name: string;
    familyName: string;
    tel: string;
    email: string;
    password: string;
    role: string;
    language: string;
    dsp_code: string;
    conversation: string;
    expoPushToken?: string;
};

const WeeklyRecapFleet = () => {
    const route = useRoute();
    const { user } = route.params as { user: User };

    type Vehicle = { _id: string; vehicleNumber: string; model: string; drivable: boolean; };
    type Status = { _id: string; name: string; color: string; };
    type Employee = { _id: string; name: string; familyName: string; };
    type Assignment = { vanId: string; statusId: string; employeeId: string; };

    const [drivableVans, setDrivableVans] = useState<Vehicle[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [statusesData, setStatusesData] = useState<Status[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

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
            const formattedDate = formatDate(selectedDate);

            const [
                vehicleResponse,
                assignmentsResponse,
                statusesResponse,
                employeesResponse
            ] = await Promise.all([
                axios.get(`${AppURL}/api/vehicles/all`, {
                    params: { dsp_code: user.dsp_code },
                }),
                axios.get(`${AppURL}/api/vanAssignments/date/${formattedDate}`, {
                    params: { dsp_code: user.dsp_code },
                }),
                axios.get(`${AppURL}/api/statuses/all`, {
                    params: { dsp_code: user.dsp_code },
                }),
                axios.get(`${AppURL}/api/employee`, {
                    params: { dsp_code: user.dsp_code },
                }),
            ]);

            setDrivableVans(vehicleResponse.data.data);
            setAssignments(assignmentsResponse.data);
            setStatusesData(statusesResponse.data);
            setEmployees(employeesResponse.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedDate]);

    const getTextColor = (backgroundColor: string) => {
        // Si la couleur d'arrière-plan est sombre, utilisez une couleur claire pour le texte
        const darkColors = ['#d3d3d3', '#001933']; // Couleurs de fond sombres
        return darkColors.includes(backgroundColor) ? '#ffffff' : '#001933';
    };


    const renderVansWithStatus = () => {
        const usedVansCount = assignments.length;

        const filteredVans = drivableVans.map((van) => {
            const assignment = assignments.find(a => a.vanId === van._id);
            let status = user.language === 'English' ? 'Not used' : 'Non utilisé';
            let statusColor = '#d3d3d3';
            let assignedEmployeeName = null;

            if (assignment) {
                const assignedStatus = statusesData.find(status => status._id === assignment.statusId);
                const assignedEmployee = employees.find(e => e._id === assignment.employeeId);

                if (assignedStatus) {
                    status = assignedStatus.name;
                    statusColor = assignedStatus.color;
                }
                if (assignedEmployee) {
                    assignedEmployeeName = `${assignedEmployee.name} ${assignedEmployee.familyName}`;
                }
            }

            return {
                ...van,
                status,
                statusColor,
                assignedEmployeeName,
            };
        }).filter((van) => {
            return (
                van.vehicleNumber.includes(searchQuery) ||
                van.model.includes(searchQuery) ||
                (van.assignedEmployeeName && van.assignedEmployeeName.includes(searchQuery))
            );
        });

        return (
            <View style={styles.listContainer}>
                <TextInput
                    style={styles.searchInput}
                    placeholder={user.language === 'English' ? 'Search by van, model, or employee' : 'Rechercher par van, modèle ou employé'}
                    value={searchQuery}
                    onChangeText={(text) => setSearchQuery(text)}
                />

                {/* Statistiques */}
                <View style={styles.statsContainer}>
                    <MaterialIcons name="local-shipping" size={24} color="#ffffff" style={styles.statsIcon} />
                    <Text style={styles.statsText}>
                        {user.language === 'English'
                            ? `Used Vans : ${usedVansCount}`
                            : `Vans utilisés : ${usedVansCount}`}
                    </Text>
                </View>

                <ScrollView style={{ height: 400 }}>
                    {filteredVans.map((van) => (
                        <View key={van._id} style={[styles.card, { backgroundColor: van.statusColor }]}>
                            <Text style={[styles.cardText, { color: getTextColor(van.statusColor) }]}>
                                {van.vehicleNumber} ({van.status})
                            </Text>
                            {van.assignedEmployeeName && (
                                <Text style={[styles.assignedEmployeeText, { color: getTextColor(van.statusColor) }]}>
                                    {user.language === 'English' ? 'Assigned to:' : 'Assigné à:'} {van.assignedEmployeeName}
                                </Text>
                            )}
                        </View>
                    ))}
                </ScrollView>


            </View>
        );
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(selectedDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();

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
            <View style={styles.dateNavigation}>
                <Text onPress={() => changeDate(-1)} style={styles.iconText}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </Text>
                <Text style={styles.dateText}>{selectedDate.toDateString()}</Text>
                <Text
                    onPress={() => !isToday && changeDate(1)}
                    style={[styles.iconText, isToday && styles.disabledText]}>
                    <MaterialIcons name="arrow-forward" size={24} color={isToday ? '#ccc' : '#fff'} />
                </Text>
            </View>
            {renderVansWithStatus()}
        </View>
    );
};

export default WeeklyRecapFleet;

const styles = StyleSheet.create({
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginBottom: 20,
        backgroundColor: '#001933', // Couleur verte agréable
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    statsText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginLeft: 10, // Espacement entre l'icône et le texte
    },
    statsIcon: {
        color: '#ffffff',
    },
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '600',
        color: '#001933',
    },
    dateNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    iconText: {
        padding: 10,
        borderRadius: 50,
        backgroundColor: '#001933',
        color: '#fff',
        textAlign: 'center',
    },
    disabledText: {
        backgroundColor: '#ccc',
        color: '#fff',
    },
    dateText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#001933',
    },
    listContainer: {
        flex: 1,
    },
    card: {
        padding: 20,
        marginVertical: 10,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        backgroundColor: '#fff',
    },
    cardText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 'bold',
    },
    searchInput: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        paddingHorizontal: 16,
        marginBottom: 15,
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    assignedEmployeeText: {
        fontSize: 14,
        color: '#ffffff', // Blanc pour un meilleur contraste
        marginTop: 5,
        fontWeight: 'bold',
    },
});

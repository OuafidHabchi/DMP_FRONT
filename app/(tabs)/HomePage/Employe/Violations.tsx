import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Alert,
} from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons'; 
import AppURL from '@/components/src/URL';

type Violation = {
    _id: string;
    type: string;
    description: string;
    link: string;
    seen: boolean;
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

const Violations = () => {
    const route = useRoute();
    const { user } = route.params as { user: User };

    const [startDate, setStartDate] = useState<string>(
        new Date().toISOString().split('T')[0]
    );
    const [violations, setViolations] = useState<Violation[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    const fetchEmployeeViolations = async (startDate: string, employeeId: string): Promise<void> => {
        setLoading(true);
        setViolations([]);
        try {
            const response = await axios.get<Violation[]>(`${AppURL}/api/dailyViolations/violations/employee-details?dsp_code=${user.dsp_code}`, {
                params: { date: startDate, employeeId },
            });

            if (response.data) {
                setViolations(response.data);
            } else {
                setViolations([]);
            }
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                setViolations([]);
            } else {
                console.error('Error fetching violations:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleViolationPress = async (violation: Violation) => {
        try {
            await axios.put(`${AppURL}/api/dailyViolations/${violation._id}?dsp_code=${user.dsp_code}`, {
                seen: true,
            });

            setViolations((prevViolations) =>
                prevViolations.map((v) =>
                    v._id === violation._id ? { ...v, seen: true } : v
                )
            );

            if (violation.link) {
                Linking.openURL(violation.link);
            } else {
                Alert.alert(
                    user.language === 'English' ? 'Error' : 'Erreur',
                    user.language === 'English'
                        ? 'No valid link found for this violation.'
                        : 'Aucun lien valide trouvé pour cette violation.'
                );
            }
        } catch (error) {
            console.error('Error updating violation:', error);
            Alert.alert('Error', 'Failed to update the violation.');
        }
    };

    useEffect(() => {
        if (user && user._id) {
            fetchEmployeeViolations(startDate, user._id);
        }
    }, [startDate]);

    const changeDate = (days: number) => {
        const current = new Date(startDate);
        current.setDate(current.getDate() + days);
        setStartDate(current.toISOString().split('T')[0]);
    };

    const getBarColor = () => {
        const count = violations.length;
        if (count === 0) return '#27ae60';
        if (count > 0 && count <= 3) return '#ffa500';
        if (count > 3) return '#ff4c4c';
        return '#2c3e50';
    };

    return (
        <View style={styles.container}>
            <View style={styles.dateNavigation}>
                <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(-1)}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.dateText}>{startDate}</Text>
                <TouchableOpacity style={styles.dateButton} onPress={() => changeDate(1)}>
                    <MaterialIcons name="arrow-forward" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={[styles.infoBar, { backgroundColor: getBarColor() }]}>
                {loading ? (
                    <Text style={styles.infoBarText}>
                        {user.language === 'English' ? 'Loading...' : 'Chargement...'}
                    </Text>

                ) : (
                    <Text style={styles.infoBarText}>
                        {user.language === 'English'
                            ? (violations.length > 0
                                ? `${violations.length} violations committed`
                                : 'Well done! No violations today')
                            : (violations.length > 0
                                ? `${violations.length} violations commises`
                                : 'Bravo ! Aucune violation aujourd\'hui')}
                    </Text>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#001933" style={styles.loading} />
            ) : (
                <FlatList
                    data={violations}
                    keyExtractor={(item) => `${item._id}`}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.violationCard}
                            onPress={() => handleViolationPress(item)}
                        >
                            <View style={styles.violationRow}>
                                <Text style={styles.violationType}>{item.type}</Text>
                                <MaterialIcons
                                    name={item.seen ? 'visibility' : 'visibility-off'}
                                    size={20}
                                    color={item.seen ? '#2ecc71' : '#e74c3c'}
                                />
                            </View>
                            {item.description && (
                                <Text style={styles.violationDescription}>{item.description}</Text>
                            )}
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f7f9fc', padding: 16 },
    infoBar: { padding: 16, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
    infoBarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    dateNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dateText: { fontSize: 16, fontWeight: 'bold', color: '#2c3e50' },
    dateButton: { backgroundColor: '#001933', borderRadius: 20, padding: 8 },
    loading: { marginTop: 20 },
    violationCard: {
        padding: 16,
        borderRadius: 8,
        backgroundColor: '#fff',
        shadowColor: '#000',
        marginBottom: 12,
    },
    violationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    violationType: { fontSize: 16, fontWeight: 'bold', color: '#34495e' },
    violationDescription: { fontSize: 14, color: '#7f8c8d', marginTop: 8 },
});

export default Violations;

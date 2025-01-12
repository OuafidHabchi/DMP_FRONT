import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import axios from 'axios';
import { useRoute } from '@react-navigation/native';

const URL_Employee = 'https://coral-app-wqv9l.ondigitalocean.app';
const URL_Quiz = 'https://coral-app-wqv9l.ondigitalocean.app';

type Employee = {
  _id: string;
  name: string;
  familyName: string;
  quiz: boolean;
};

type Quiz = {
  _id: string;
  employeeId: string;
  result: string;
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

const QuizManagement = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };
  const [quizEmployees, setQuizEmployees] = useState<(Employee & { score: string; date: string; quizId: string })[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [quizSearchQuery, setQuizSearchQuery] = useState(''); // For quiz search
  const [filteredQuizzes, setFilteredQuizzes] = useState<(Employee & { score: string; date: string; quizId: string })[]>([]);

  useEffect(() => {
    fetchQuizData();
  }, []);

  useEffect(() => {
    handleQuizSearch(quizSearchQuery); // Filter quizzes when the search query changes
  }, [quizSearchQuery, quizEmployees]);

  const fetchQuizData = async () => {
    try {
      const quizzesResponse = await axios.get<Quiz[]>(`${URL_Quiz}/api/quiz?dsp_code=${user.dsp_code}`);
      const employeesResponse = await axios.get<Employee[]>(`${URL_Employee}/api/employee?dsp_code=${user.dsp_code}`);

      const quizzes = quizzesResponse.data;
      const allEmployees = employeesResponse.data;

      const matchedEmployees = quizzes
        .map((quiz) => {
          const employee = allEmployees.find((emp) => emp._id === quiz.employeeId);
          if (employee) {
            return {
              ...employee,
              score: quiz.result,
              date: quiz.date,
              quizId: quiz._id,
            };
          }
          console.warn(`Quiz ${quiz._id} has no matching employeeId: ${quiz.employeeId}`);
          return null;
        })
        .filter((emp): emp is Employee & { score: string; date: string; quizId: string } => emp !== null);

      setQuizEmployees(matchedEmployees);
      setFilteredQuizzes(matchedEmployees);
      setEmployees(allEmployees);
      setFilteredEmployees(allEmployees);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const filtered = employees.filter((emp) =>
      emp.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredEmployees(filtered);
  };

  const handleQuizSearch = (query: string) => {
    setQuizSearchQuery(query);
    const filtered = quizEmployees.filter((quiz) =>
      `${quiz.name} ${quiz.familyName}`.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredQuizzes(filtered);
  };


  const handleSendQuiz = async () => {
    if (!selectedEmployee) {
      Alert.alert('Error', 'Please select an employee');
      return;
    }

    try {
      await axios.put(`${URL_Employee}/api/employee/profile/${selectedEmployee._id}?dsp_code=${user.dsp_code}`, {
        quiz: true,
      });
      Alert.alert('Success', 'Quiz assigned to the employee');
      window.alert(`Quiz assigned to ${selectedEmployee.name} ${selectedEmployee.familyName}`);
      setModalVisible(false);
      setSelectedEmployee(null);
      setSearchQuery('');
    } catch (error) {
      console.error('Error assigning quiz:', error);
      Alert.alert('Error', 'Failed to assign quiz');
    }
  };

  const renderList = () => {
    const list = Platform.OS === 'web' ? filteredQuizzes : filteredQuizzes;

    if (Platform.OS === 'web') {
      return (
        <ScrollView style={styles.scrollContainer}>
          {list.map((item) => (
            <View key={item.quizId} style={styles.quizItem}>
              <Text style={[styles.quizText, parseInt(item.score) >= 80 ? styles.greenScore : styles.redScore]}>
                {item.name} {item.familyName}     {item.score} %
              </Text>
              <Text>
                {new Date(item.date).toLocaleString()}
              </Text>
            </View>
          ))}
        </ScrollView>
      );
    }

    return (
      <FlatList
        data={list}
        keyExtractor={(item) => item.quizId}
        renderItem={({ item }) => (
          <View style={styles.quizItem}>
            <Text style={[styles.quizText, parseInt(item.score) >= 80 ? styles.greenScore : styles.redScore]}>
              {item.name} {item.familyName}     {item.score} %
            </Text>
            <Text>
              {new Date(item.date).toLocaleString()}
            </Text>
          </View>
        )}
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {user.language === 'English' ? 'Quiz Management' : 'Gestion du Quiz'}
      </Text>

      {/* Search bar for quizzes */}
      <TextInput
        style={styles.searchBar}
        placeholder={user.language === 'English' ? 'Search in quizzes' : 'Rechercher dans les quizzes'}
        value={quizSearchQuery}
        onChangeText={handleQuizSearch}
      />

      {renderList()}

      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>
            {user.language === 'English' ? 'Assign Quiz' : 'Assigner un Quiz'}
          </Text>
          <TextInput
            style={styles.searchBar}
            placeholder={user.language === 'English' ? 'Search Employee' : 'Rechercher un employé'}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.employeeItem,
                  selectedEmployee?._id === item._id && styles.selectedItem,
                ]}
                onPress={() => setSelectedEmployee(item)}
              >
                <Text style={styles.employeeText}>{item.name} {item.familyName}</Text>
              </TouchableOpacity>
            )}
          />
          <Pressable style={styles.sendButton} onPress={handleSendQuiz}>
            <Text style={styles.sendButtonText}>
              {user.language === 'English' ? 'Send' : 'Envoyer'}
            </Text>
          </Pressable>
          <Pressable style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.closeButtonText}>
              {user.language === 'English' ? 'Close' : 'Fermer'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

export default QuizManagement;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f9',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#34495e',
    textAlign: 'center',
    marginVertical: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  quizItem: {
    backgroundColor: '#ecf0f1',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    elevation: 2,
  },
  quizText: {
    fontSize: 16,
    fontWeight: '600',
  },
  greenScore: {
    color: '#27ae60',
  },
  redScore: {
    color: '#e74c3c',
  },
  searchBar: {
    backgroundColor: '#ecf0f1',
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  addButton: {
    backgroundColor: '#001933',
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 30,
    right: 30,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  modalView: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 20,
    textAlign: 'center',
  },
  employeeItem: {
    backgroundColor: '#dff9fb',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#c7ecee',
  },
  selectedItem: {
    backgroundColor: '#badc58',
  },
  employeeText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  sendButton: {
    backgroundColor: '#001933',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Modal,
  Pressable,
  Alert,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import axios from 'axios';
import AppURL from '@/components/src/URL';
import { useUser } from '@/context/UserContext';
import PickerModal from '@/components/src/PickerModal';



type Question = {
  id: string; // ✅ Ajouté
  questionText: string;
  options: string[];
  correctAnswer: string;
};

type Quiz = {
  createdBy: any;
  _id: string;
  title: string;
  questions: Question[];
};


type Employee = {
  status: string;
  _id: string;
  name: string;
  familyName: string;
  score: number;
  assignmentId: string; // ✅ Ajout de cette ligne
};


const QuizManagement = () => {
  const { user } = useUser();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);

  const [selectedQuiz, setSelectedQuiz] = useState<{
    _id: string;
    title: string;
    questions: Question[];
  } | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [newQuiz, setNewQuiz] = useState<{
    title: string;
    questions: Question[]
  }>({
    title: '',
    questions: []
  });

  // États nécessaires pour la gestion de l'affichage et de l'assignation
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]); // Liste complète des employés
  const [searchQuery, setSearchQuery] = useState('');
  const [employeeAnswers, setEmployeeAnswers] = useState<any[]>([]);
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(true);
  const [employeeSearch, setEmployeeSearch] = useState('');




  useEffect(() => {
    fetchQuizzes();
    fetchAllEmployees();
  }, []);


  const closeAllModals = () => {
    setModalVisible(false);
    setShowDetailsModal(false);
    setShowAssignModal(false);
    setShowAnswersModal(false);
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/employee`, {
        params: { dsp_code: user?.dsp_code },
      });

      setAllEmployees(response.data);
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Error loading employees.'
          : 'Erreur lors du chargement des employés.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Error loading employees.'
          : 'Erreur lors du chargement des employés.'
      );
    }
  };



  const handleAssignEmployees = async () => {
    if (!selectedQuiz) return window.alert('❌ Aucun quiz sélectionné.');
    setIsLoading(true);
    try {
      const assignRequests = selectedEmployees.map((empId) =>
        axios.post(`${AppURL}/api/quiz/assign?dsp_code=${user?.dsp_code}`, {
          quizId: selectedQuiz._id,
          employeeId: empId,
        })
      );
      await Promise.all(assignRequests);
      await fetchAssignedEmployees(selectedQuiz._id);
      setShowAssignModal(false);
      setSelectedEmployees([]);
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Error during assignment.'
          : 'Erreur lors de l\'assignation.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Error during assignment.'
          : 'Erreur lors de l\'assignation.'
      );

    } finally {
      setIsLoading(false);
    }
  };



  const handleUpdateQuiz = async () => {
    if (!selectedQuiz) return;
    setIsLoading(true);
    const quizWithIds = {
      ...selectedQuiz,
      questions: selectedQuiz.questions.map((q) => ({
        ...q,
        id: q.id ?? `${Date.now()}-${Math.random()}`, // ✅ Ajoute un ID manquant
      })),
    };

    try {
      await axios.put(`${AppURL}/api/quiz/${selectedQuiz._id}?dsp_code=${user?.dsp_code}`, quizWithIds);
      setShowDetailsModal(false)
      fetchQuizzes();
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Error saving changes.'
          : 'Erreur lors de l\'enregistrement des modifications.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Error saving changes.'
          : 'Erreur lors de l\'enregistrement des modifications.'
      );

    } finally {
      setIsLoading(false);
    }
  };



  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev: string[]) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };


  const fetchQuizzes = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${AppURL}/api/quiz/?dsp_code=${user?.dsp_code}`);
      const quizzesWithIds = response.data.map((quiz: { questions: any[]; }) => ({
        ...quiz,
        questions: quiz.questions.map((q) => ({
          ...q,
          id: q.id ?? `${Date.now()}-${Math.random()}`, // ✅ Génère un ID unique si absent
        })),
      }));
      setQuizzes(quizzesWithIds);
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Error fetching quizzes.'
          : 'Erreur lors de la récupération des quiz.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Error fetching quizzes.'
          : 'Erreur lors de la récupération des quiz.'
      );
    } finally {
      setIsLoading(false);
    }
  };



  const handleCreateQuiz = async () => {
    setIsLoading(true);
    const quizWithCreatedBy = { ...newQuiz, createdBy: user?._id };
    try {
      await axios.post(`${AppURL}/api/quiz/create?dsp_code=${user?.dsp_code}`, quizWithCreatedBy);
      setModalVisible(false);
      fetchQuizzes();
      setNewQuiz({ title: '', questions: [] });
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Error creating quiz.'
          : 'Erreur lors de la création du quiz.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Error creating quiz.'
          : 'Erreur lors de la création du quiz.'
      );

    } finally {
      setIsLoading(false);
    }
  };
  // ✅ Ajoute automatiquement un champ "X" devant chaque question
  const addQuestionWithDeleteIcon = (quiz: { title: string; questions: Question[]; }, setQuiz: { (value: React.SetStateAction<{ title: string; questions: Question[]; }>): void; (arg0: (prevQuiz: any) => any): void; }) => {
    const newQuestion = {
      id: `${Date.now()}-${Math.random()}`, // ✅ Génère un UUID unique
      questionText: '',
      options: ['', '', ''],
      correctAnswer: '',
    };
    setQuiz((prevQuiz) => ({
      ...prevQuiz,
      questions: [...prevQuiz.questions, newQuestion],
    }));
  };



  const removeQuestion = (quiz: { questions: Question[] }, setQuiz: (arg0: any) => void, questionId: string) => {
    const updatedQuestions = quiz.questions.filter(q => q.id !== questionId);
    setQuiz({ ...quiz, questions: updatedQuestions });
  };

  const handleSelectQuiz = async (quiz: any) => {
    setIsLoading(true); // Début chargement
    closeAllModals();
    setSelectedQuiz(quiz);
    await fetchAssignedEmployees(quiz._id);
    setIsLoading(false); // Fin chargement
  };


  const fetchAssignedEmployees = async (quizId: string) => {
    setIsEmployeeLoading(true); // Commence le chargement
    try {
      const response = await axios.get(`${AppURL}/api/quiz/${quizId}/assigned-employees?dsp_code=${user?.dsp_code}`);
      const formattedEmployees = response.data.map((emp: Employee) => ({
        ...emp,
        assignmentId: emp.assignmentId,
      }));
      setEmployees(formattedEmployees);
    } catch (error) {
      Alert.alert(
        user?.language === 'English' ? 'Error' : 'Erreur',
        user?.language === 'English'
          ? 'Error loading employees.'
          : 'Erreur de chargement des employés.'
      );

      window.alert(
        user?.language === 'English'
          ? 'Error loading employees.'
          : 'Erreur de chargement des employés.'
      );
    } finally {
      setIsEmployeeLoading(false); // Fin du chargement
    }
  };


  const handleDeleteQuiz = async () => {
    if (!selectedQuiz) return;

    const confirmationMessage = user?.language === 'English'
      ? 'Are you sure you want to delete this quiz?'
      : 'Êtes-vous sûr de vouloir supprimer ce quiz ?';

    const successMessage = user?.language === 'English'
      ? 'Quiz deleted successfully!'
      : 'Quiz supprimé avec succès!';

    const errorMessage = user?.language === 'English'
      ? 'Failed to delete quiz. Please try again later.'
      : 'Échec de la suppression du quiz. Veuillez réessayer plus tard.';

    // Confirmation pour mobile (React Native)
    if (Platform.OS !== 'web') {
      return Alert.alert(
        user?.language === 'English' ? 'Confirmation' : 'Confirmation',
        confirmationMessage,
        [
          {
            text: user?.language === 'English' ? 'Cancel' : 'Annuler',
            style: 'cancel',
          },
          {
            text: user?.language === 'English' ? 'Delete' : 'Supprimer',
            onPress: async () => {
              await confirmDeleteQuiz(successMessage, errorMessage);
            },
            style: 'destructive',
          },
        ]
      );
    }

    // Confirmation pour le Web
    if (window.confirm(confirmationMessage)) {
      await confirmDeleteQuiz(successMessage, errorMessage);
    }
  };

  // Fonction séparée pour exécuter la suppression après confirmation
  const confirmDeleteQuiz = async (successMessage: string, errorMessage: string) => {
    try {
      await axios.delete(`${AppURL}/api/quiz/${selectedQuiz?._id}?dsp_code=${user?.dsp_code}`);

      // Mettre à jour l'interface après suppression
      setModalVisible(false);
      setShowDetailsModal(false);
      setSelectedQuiz(null);
      fetchQuizzes();
      setNewQuiz({ title: '', questions: [] });

      // Afficher une notification de succès
      Alert.alert('Success', successMessage);
      window.alert(successMessage);
    } catch (error) {
      Alert.alert('Error', errorMessage);
      window.alert(errorMessage);
    }
  };


  const handleViewDetails = async (employee: Employee) => {
    try {
      const response = await axios.get(`${AppURL}/api/quiz/answers/${selectedQuiz?._id}/employee/${employee._id}/answers?dsp_code=${user?.dsp_code}`);
      setEmployeeAnswers(response.data);
      setShowAnswersModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  // 🚀 Fonction pour supprimer une assignation avec confirmation
  const handleDeleteAssignment = async (assignmentId: string) => {
    const confirmationMessage = user?.language === 'English'
      ? 'Are you sure you want to delete this assignment?'
      : 'Êtes-vous sûr de vouloir supprimer cette assignation ?';

    const successMessage = user?.language === 'English'
      ? 'Assignment deleted successfully!'
      : 'Assignation supprimée avec succès!';

    const errorMessage = user?.language === 'English'
      ? 'Failed to delete assignment. Please try again later.'
      : 'Échec de la suppression de l\'assignation. Veuillez réessayer plus tard.';

    // Confirmation pour mobile (React Native)
    if (Platform.OS !== 'web') {
      return Alert.alert(
        user?.language === 'English' ? 'Confirmation' : 'Confirmation',
        confirmationMessage,
        [
          {
            text: user?.language === 'English' ? 'Cancel' : 'Annuler',
            style: 'cancel',
          },
          {
            text: user?.language === 'English' ? 'Delete' : 'Supprimer',
            onPress: async () => {
              await confirmDeleteAssignment(assignmentId, successMessage, errorMessage);
            },
            style: 'destructive',
          },
        ]
      );
    }

    // Confirmation pour le Web
    if (window.confirm(confirmationMessage)) {
      await confirmDeleteAssignment(assignmentId, successMessage, errorMessage);
    }
  };

  // Fonction séparée pour exécuter la suppression après confirmation
  const confirmDeleteAssignment = async (assignmentId: string, successMessage: string, errorMessage: string) => {
    try {
      setIsLoading(true);

      await axios.delete(`${AppURL}/api/quiz/assignments/${assignmentId}?dsp_code=${user?.dsp_code}`);

      if (selectedQuiz?._id) {
        fetchAssignedEmployees(selectedQuiz._id!);
      }

      // Afficher une notification de succès
      Alert.alert('Success', successMessage);
      window.alert(successMessage);
    } catch (error) {
      Alert.alert('Error', errorMessage);
      window.alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      <FlatList
        data={quizzes}
        keyExtractor={(item, index) => item._id ? `quiz-${item._id}` : `quiz-${index}`}
        renderItem={({ item, index }) => (
          <TouchableOpacity onPress={() => handleSelectQuiz(item)}>
            <View key={`quiz-${item._id ?? index}`} style={styles.quizItem}>
              <Text style={styles.quizText}>{item.title}</Text>
              <Text style={styles.quizCreator}>
                {user?.language === 'English' ? 'Created by:  ' : 'Créé par:  '}
                {item.createdBy ? `${item.createdBy.name} ${item.createdBy.familyName}` : 'Inconnu'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />




      <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+</Text>
      </Pressable>




      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Titre */}
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Create a Quiz' : 'Créer un Quiz'}
            </Text>

            {/* Champ Titre */}
            <TextInput
              placeholder={user?.language === 'English' ? 'Quiz Title' : 'Titre du Quiz'}
              value={newQuiz.title ?? ''}
              onChangeText={(text) => setNewQuiz({ ...newQuiz, title: text })}
              style={styles.inputTitle}
            />

            {/* Liste des questions */}
            <ScrollView style={styles.questionsList}>
              {newQuiz.questions.map((question, index) => (
                <View key={question.id} style={styles.questionBlock}>
                  {/* 🗑️ Bouton Supprimer Question */}
                  <TouchableOpacity
                    style={styles.deleteQuestionButton}
                    onPress={() => removeQuestion(newQuiz, setNewQuiz, question.id)}
                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                  </TouchableOpacity>

                  {/* Champ Question */}
                  <TextInput
                    placeholder={
                      user?.language === 'English' ? `Question ${index + 1}` : `Question ${index + 1}`
                    }
                    value={question.questionText ?? ''}
                    multiline
                    onChangeText={(text) => {
                      const updatedQuestions = [...newQuiz.questions];
                      updatedQuestions[index].questionText = text;
                      setNewQuiz({ ...newQuiz, questions: updatedQuestions });
                    }}
                    style={styles.questionInput}
                  />

                  {/* Champs Réponses */}
                  {['A', 'B', 'C'].map((option, optIndex) => (
                    <View key={optIndex} style={styles.answerRow}>
                      <Text style={styles.answerLabel}>{option}:</Text>
                      <TextInput
                        placeholder={
                          user?.language === 'English' ? `Answer ${option}` : `Réponse ${option}`
                        }
                        value={question.options[optIndex] ?? ''}
                        onChangeText={(text) => {
                          const updatedQuestions = [...newQuiz.questions];
                          updatedQuestions[index].options[optIndex] = text;
                          setNewQuiz({ ...newQuiz, questions: updatedQuestions });
                        }}
                        style={styles.answerInput}
                      />
                    </View>
                  ))}

                  {/* Sélection de la bonne réponse */}
                  <Text style={styles.label}>
                    {user?.language === 'English' ? 'Correct Answer:' : 'Bonne réponse:'}
                  </Text>
                  <PickerModal
                    title={
                      user?.language === 'English'
                        ? 'Choose the correct answer'
                        : 'Choisir la bonne réponse'
                    }
                    options={question.options.map((option, optIndex) => ({
                      label:
                        option || `${user?.language === 'English' ? 'Answer' : 'Réponse'} ${optIndex + 1}`,
                      value: option,
                      key: `${optIndex}-${index}-${Date.now()}`,
                    }))}
                    selectedValue={question.correctAnswer}
                    onValueChange={(value) => {
                      const updatedQuestions = [...newQuiz.questions];
                      updatedQuestions[index].correctAnswer = value;
                      setNewQuiz({ ...newQuiz, questions: updatedQuestions });
                    }}
                  />
                </View>
              ))}
            </ScrollView>

            {/* ➕ Bouton Ajouter Question */}
            <TouchableOpacity
              style={styles.addQuestionButton}
              onPress={() => addQuestionWithDeleteIcon(newQuiz, setNewQuiz)}
            >
              <Text style={styles.addQuestionText}>
                {user?.language === 'English' ? 'Add a Question' : 'Ajouter une question'}
              </Text>
            </TouchableOpacity>

            {/* Boutons d'action */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </Pressable>

              <Pressable style={styles.submitButton} onPress={handleCreateQuiz}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Create' : 'Créer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>





      <Modal
        visible={!!selectedQuiz && !showDetailsModal && !showAssignModal && !showAnswersModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalEmployees_container}>
          <View style={styles.modalEmployees_box}>
            {/* 📝 Titre */}
            <Text style={styles.modalEmployees_title}>
              {user?.language === 'English' ? 'Quiz:' : 'Quiz :'} {selectedQuiz?.title ?? ''}
            </Text>
            <TextInput
              style={styles.searchBar}
              placeholder={
                user?.language === 'English'
                  ? '🔍 Search for an employee'
                  : '🔍 Rechercher un employé'
              } placeholderTextColor="#aaa"
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
            />


            {/* 🌀 Loader pendant le chargement */}
            {isEmployeeLoading ? (
              <View style={{ alignItems: 'center', marginVertical: 20 }}>
                <ActivityIndicator size="large" color="#001933" />
                <Text style={{ color: '#001933', fontSize: 16, marginTop: 10 }}>
                  {user?.language === 'English' ? 'Loading employees...' : 'Chargement des employés...'}
                </Text>
              </View>
            ) : (
              // 👥 Liste des employés chargés
              <FlatList
                data={employees.filter(emp =>
                  `${emp.name ?? ''} ${emp.familyName ?? ''}`.toLowerCase().includes(employeeSearch.toLowerCase())
                )}
                keyExtractor={(item, index) =>
                  item.assignmentId ? `assign-${item.assignmentId}` : `employee-${index}`
                }
                renderItem={({ item, index }) => (
                  <View key={`employee-${item.assignmentId ?? item._id ?? index}`} style={styles.modalEmployees_item}>
                    <TouchableOpacity onPress={() => handleViewDetails(item)}>
                      <Text style={styles.modalEmployees_name}>
                        {item.name ?? ''} {item.familyName ?? ''} {item.status === 'completed' ? '✅ ' : ''}
                      </Text>
                      <Text
                        style={[
                          styles.modalEmployees_score,
                          item.status === 'completed' && item.score < 80 ? { color: 'red' } : {},
                          item.status === 'completed' && item.score >= 80 ? { color: 'green' } : {}
                        ]}
                      >
                        {user?.language === 'English' ? 'Score:' : 'Score :'} {item.score ?? 0}%
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        if (item.assignmentId) {
                          handleDeleteAssignment(item.assignmentId);
                        }
                      }}
                      style={styles.deleteButtonSmall}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold' }}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              />
            )}

            {/* 🛠️ Boutons Actions */}
            <View style={styles.floatingButtonContainer}>
              <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => {
                  setShowDetailsModal(false);
                  setTimeout(() => setShowDetailsModal(true), 10);
                }}
              >
                <Text style={styles.floatingButtonText}>🛠️</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.floatingButton}
                onPress={() => setShowAssignModal(true)}
              >
                <Text style={[styles.floatingButtonText, { color: '#FFFFFF' }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* ❌ Bouton Fermer */}
            <Pressable
              style={styles.modalEmployees_closeButton}
              onPress={() => setSelectedQuiz(null)}
            >
              <Text style={styles.modalEmployees_closeButtonText}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>





      <Modal visible={showDetailsModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* 🖋️ Titre */}
            <Text style={styles.modalTitle}>
              {user?.language === 'English' ? 'Edit Quiz' : 'Modifier le Quiz'}{' '}
              {selectedQuiz?.title ?? ''}
            </Text>

            {/* 📝 Champ Titre */}
            <TextInput
              placeholder={user?.language === 'English' ? 'Quiz Title' : 'Titre du Quiz'}
              value={selectedQuiz?.title ?? ''}
              onChangeText={(text) => {
                if (selectedQuiz) {
                  setSelectedQuiz({ ...selectedQuiz, title: text });
                }
              }}
              style={styles.inputTitle}
            />

            {/* 🔍 Liste des questions */}
            <ScrollView style={styles.questionsList}>
              {selectedQuiz?.questions?.map((q, index) => (
                <View
                  key={`question-${q.id ?? index}`} // ✅ Correction : Clé unique
                  style={styles.questionBlock}
                >
                  {/* 🗑️ Bouton Supprimer Question */}
                  <TouchableOpacity
                    style={styles.deleteQuestionButton}
                    onPress={() => {
                      if (!q.id) return; // ✅ Évite une suppression par erreur si l'ID est absent
                      const updatedQuestions = selectedQuiz.questions.filter(
                        (question) => question.id !== q.id
                      );
                      setSelectedQuiz((prevQuiz) => {
                        if (!prevQuiz) return null;
                        return {
                          _id: prevQuiz._id,
                          title: prevQuiz.title,
                          questions: updatedQuestions,
                        };
                      });

                    }}

                  >
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>X</Text>
                  </TouchableOpacity>

                  {/* 🧠 Question */}
                  <TextInput
                    placeholder={user?.language === 'English' ? 'Question' : 'Question'}
                    value={q.questionText ?? ''}
                    multiline
                    onChangeText={(text) => {
                      const updatedQuestions = selectedQuiz.questions.map((question) =>
                        question.id === q.id ? { ...question, questionText: text } : question
                      );
                      setSelectedQuiz((prevQuiz) =>
                        prevQuiz ? { ...prevQuiz, questions: updatedQuestions } : prevQuiz
                      );
                    }}
                    style={styles.questionInput}
                  />

                  {/* 💡 Réponses */}
                  {q.options.map((option, optIndex) => (
                    <View
                      key={`option-${q.id ?? index}-${optIndex}`} // ✅ Clé unique par option
                      style={styles.answerRow}
                    >
                      <Text style={styles.answerLabel}>
                        {String.fromCharCode(65 + optIndex)}:
                      </Text>
                      <TextInput
                        placeholder={`Réponse ${String.fromCharCode(65 + optIndex)}`}
                        value={option ?? ''}
                        onChangeText={(text) => {
                          const updatedQuestions = selectedQuiz.questions.map((question) =>
                            question.id === q.id
                              ? {
                                ...question,
                                options: question.options.map((opt, i) =>
                                  i === optIndex ? text : opt
                                ),
                              }
                              : question
                          );
                          setSelectedQuiz((prevQuiz) =>
                            prevQuiz ? { ...prevQuiz, questions: updatedQuestions } : prevQuiz
                          );
                        }}
                        style={styles.answerInput}
                      />
                    </View>
                  ))}

                  {/* ✅ Sélection de la bonne réponse */}
                  <Text style={styles.label}>
                    {user?.language === 'English' ? 'Correct Answer:' : 'Bonne réponse:'}
                  </Text>
                  <PickerModal
                    title={
                      user?.language === 'English'
                        ? 'Choose the correct answer'
                        : 'Choisir la bonne réponse'
                    }
                    options={q.options.map((option, optIndex) => ({
                      label:
                        option ||
                        `${user?.language === 'English' ? 'Answer' : 'Réponse'} ${optIndex + 1}`,
                      value: option ?? '',
                    }))}
                    selectedValue={q.correctAnswer ?? ''}
                    onValueChange={(value) => {
                      const updatedQuestions = selectedQuiz.questions.map((question) =>
                        question.id === q.id
                          ? { ...question, correctAnswer: value }
                          : question
                      );
                      setSelectedQuiz((prevQuiz) =>
                        prevQuiz ? { ...prevQuiz, questions: updatedQuestions } : prevQuiz
                      );
                    }}
                  />
                </View>
              ))}
            </ScrollView>

            {/* ➕ Bouton pour ajouter une nouvelle question */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 }}>
              <TouchableOpacity
                style={styles.addQuestionButtonUpdate}
                onPress={() => {
                  if (selectedQuiz?.questions) {
                    const newQuestion: Question = {
                      id: `${Date.now()}-${Math.random()}`, // ✅ Id unique
                      questionText: '',
                      options: ['', '', ''],
                      correctAnswer: '',
                    };
                    const updatedQuestions = [...selectedQuiz.questions, newQuestion];
                    setSelectedQuiz({
                      ...selectedQuiz,
                      questions: updatedQuestions,
                    });
                  }
                }}
              >
                <Text style={styles.addQuestionText}>+</Text>
              </TouchableOpacity>

              {/* 🗑️ Bouton Supprimer Quiz */}
              <Pressable style={styles.deleteButton} onPress={handleDeleteQuiz}>
                <Text style={styles.buttonText}>🗑️</Text>
              </Pressable>
            </View>

            {/* 🛠️ Boutons d'action */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelButton} onPress={() => setShowDetailsModal(false)}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </Pressable>

              <Pressable style={styles.submitButton} onPress={handleUpdateQuiz}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Save' : 'Enregistrer'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>







      <Modal visible={showAssignModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalAssignContainer}>
            {/* Barre de recherche */}
            <TextInput
              style={styles.searchBar}
              placeholder={
                user?.language === 'English'
                  ? '🔍 Search for an employee'
                  : '🔍 Rechercher un employé'
              }
              placeholderTextColor="#aaa"
              onChangeText={(text) => setSearchQuery(text ?? '')}
              value={searchQuery ?? ''}
            />

            {/* Liste filtrée des employés */}
            <ScrollView style={styles.employeeList}>
              {allEmployees
                .filter((emp) =>
                  `${emp.name ?? ''} ${emp.familyName ?? ''}`
                    .toLowerCase()
                    .includes(searchQuery?.toLowerCase() ?? '')
                )
                .map((emp) => (
                  <TouchableOpacity
                    key={emp._id}
                    style={[
                      styles.employeeItem,
                      selectedEmployees.includes(emp._id) && styles.employeeSelected,
                    ]}
                    onPress={() => toggleEmployeeSelection(emp._id)}
                  >
                    <Text
                      style={[
                        styles.employeeText,
                        selectedEmployees.includes(emp._id) && styles.employeeTextSelected,
                      ]}
                    >
                      {`${emp.name ?? ''} ${emp.familyName ?? ''}`}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Boutons d'action */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelButton} onPress={() => setShowAssignModal(false)}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Cancel' : 'Annuler'}
                </Text>
              </Pressable>

              <Pressable style={styles.assignButton} onPress={handleAssignEmployees}>
                <Text style={styles.buttonText}>
                  {user?.language === 'English' ? 'Assign' : 'Assigner'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>




      <Modal visible={showAnswersModal} animationType="slide" transparent={true}>
        <View style={styles.modalAnswers_overlay}>
          <View style={styles.modalAnswers_container}>
            {/* Titre avec règle de langue */}
            <Text style={styles.modalAnswers_title}>
              {user?.language === 'English' ? 'Answer Details' : 'Détails des réponses'}
            </Text>

            <ScrollView style={styles.modalAnswers_list}>
              {employeeAnswers.map((answer, index) => (
                <View key={`answer-${answer.question}-${index}`} style={styles.modalAnswers_questionBlock}>
                  <Text style={styles.modalAnswers_questionText}>
                    ❓ {answer.question ?? ''}
                  </Text>
                  <Text style={styles.modalAnswers_userAnswer}>
                    {user?.language === 'English' ? '🧑‍💼 Employee Answer:' : '🧑‍💼 Réponse employé :'}{' '}
                    <Text style={{ color: answer.isCorrect ? 'green' : 'red' }}>
                      {answer.userAnswer ?? ''}
                    </Text>
                  </Text>
                  <Text style={styles.modalAnswers_correctAnswer}>
                    {user?.language === 'English' ? '✅ Correct Answer:' : '✅ Bonne réponse :'}{' '}
                    {answer.correctAnswer ?? ''}
                  </Text>
                </View>
              ))}

            </ScrollView>

            {/* Bouton Fermer */}
            <Pressable
              style={styles.modalAnswers_closeButton}
              onPress={() => setShowAnswersModal(false)}
            >
              <Text style={styles.modalAnswers_closeButtonText}>
                {user?.language === 'English' ? 'Close' : 'Fermer'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>






    </View>
  );
};

const styles = StyleSheet.create({
  quizCreator: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
    fontStyle: 'italic',
  },
  deleteQuestionButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'red',
    padding: 5,
    borderRadius: 10,
    zIndex: 10,
  },
  deleteButtonSmall: {
    position: 'absolute',
    right: 15,
    top: 12,
    backgroundColor: 'red',
    padding: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  // Styles dédiés au modal des réponses
  modalAnswers_overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalAnswers_container: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#001933',
  },
  modalAnswers_title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#001933',
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderColor: '#001933',
    paddingBottom: 10,
  },
  modalAnswers_list: {
    maxHeight: 400,
    marginBottom: 15,
  },
  modalAnswers_questionBlock: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    marginVertical: 10,
    borderRadius: 15,
    borderLeftWidth: 5,
    borderColor: '#001933',
  },
  modalAnswers_questionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#001933',
  },
  modalAnswers_userAnswer: {
    fontSize: 16,
    marginVertical: 3,
    color: '#333',
  },
  modalAnswers_correctAnswer: {
    fontSize: 16,
    color: 'green',
    marginTop: 3,
  },
  modalAnswers_closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'red',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalAnswers_closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalAssignContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#001933',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    color: '#001933',
  },
  employeeList: {
    marginVertical: 10,
    maxHeight: 350,
  },
  employeeItem: {
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    backgroundColor: '#f1f1f1',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  employeeSelected: {
    backgroundColor: '#001933',
    borderColor: '#0056b3',
  },
  employeeText: {
    fontSize: 14,
    color: '#001933',
  },
  employeeTextSelected: {
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: 'red',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',
  },
  assignButton: {
    backgroundColor: '#001933',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },


  floatingButtonContainer: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    flexDirection: 'row',
    gap: 15,
  },
  floatingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#001933',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  floatingButtonText: {
    color: '#fff', fontSize: 30,

  },
  modalEmployees_container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  employeesScrollView: {
    maxHeight: 300, // Limite la hauteur de la liste
    marginBottom: 10,
  },
  modalEmployees_box: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#001933',
  },

  modalEmployees_title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#001933',
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#001933',
    paddingBottom: 15,
  },
  modalEmployees_item: {
    backgroundColor: '#F7F7F7',
    padding: 15,
    marginVertical: 6,
    borderRadius: 15,
    borderLeftWidth: 5,
    borderColor: '#001933',
  },
  modalEmployees_name: {
    fontSize: 18,
    fontWeight: '500',
    color: '#001933',
  },
  modalEmployees_score: {
    fontSize: 14,
    color: '#001933',
    marginTop: 5,
  },
  modalEmployees_detailsButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalEmployees_detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  modalEmployees_closeButton: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'red',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  modalEmployees_closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },

  // 🎨 MODAL DÉTAILS
  modalDetails_container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalDetails_box: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  modalDetails_title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalDetails_question: {
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
    padding: 15,
    borderRadius: 15,
    borderLeftWidth: 5,
    borderColor: '#10B981',
  },
  modalDetails_questionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111827',
  },
  modalDetails_options: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalDetails_correct: {
    marginTop: 5,
    fontSize: 16,
    color: '#22C55E',
  },
  modalDetails_actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalDetails_updateButton: {
    backgroundColor: '#3B82F6',
    padding: 15,
    borderRadius: 10,
  },
  modalDetails_deleteButton: {
    backgroundColor: '#EF4444',
    padding: 15,
    borderRadius: 10,
  },
  modalDetails_buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalDetails_closeButton: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#6B7280',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDetails_closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  detailsAssignButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#007BFF',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalDetailsContainer: { flex: 1, padding: 20, backgroundColor: '#fff' },
  detailsTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  detailsSection: { fontSize: 18, marginVertical: 5 },
  questionDetail: { marginLeft: 10, marginBottom: 5 },

  detailsActionButtons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  updateButton: { backgroundColor: '#007BFF', padding: 10, borderRadius: 10 },

  deleteButton: {
    backgroundColor: "red",
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',
  },
  closeButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#001933',
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#001933',
    textAlign: 'center',
    marginBottom: 25,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    borderBottomWidth: 2,
    borderColor: '#001933',
    paddingBottom: 10,
  },
  inputTitle: {
    borderWidth: 2,
    borderColor: '#001933',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    fontSize: 18,
    color: '#001933',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  questionsList: {
    maxHeight: 400,
    padding: 5,
    borderRadius: 10,
    backgroundColor: '#fffff',
    borderWidth: 1,
    borderColor: '#001933',
    marginBottom: 15,
  },
  questionBlock: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    backgroundColor: '#ffff',
    borderLeftWidth: 5,
    borderColor: '#001933',
    shadowColor: '#001933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  questionInput: {
    borderWidth: 1,
    borderColor: '#001933',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  answerLabel: {
    width: 30,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001933',
  },
  answerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#001933',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
  },
  label: {
    marginTop: 10,
    fontSize: 16,
    color: '#001933',
    fontWeight: '600',
  },
  addQuestionButton: {
    backgroundColor: '#001933',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',

  },

  addQuestionButtonUpdate: {
    backgroundColor: '#001933',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',

  },
  addQuestionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },


  submitButton: {
    backgroundColor: '#001933',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    width: '45%',
  },
  detailsContainer: {
    marginTop: 20,
    padding: 20,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#001933',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    alignItems: 'center',
  },
  modalView: {
    flex: 1,
    padding: 20,
    borderRadius: 25,
    margin: 15,
    backgroundColor: '#f0f4f7',
    borderWidth: 1,
    borderColor: '#d3d3d3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 7,
    alignItems: 'center',
  },

  titleInput: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    borderColor: '#007BFF',
    width: '90%',
    backgroundColor: '#fff',
    fontSize: 16,
  },
  questionsContainer: {
    width: '100%',
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  questionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2c3e50',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    borderColor: '#6c757d',
    backgroundColor: '#fdfdfd',
    fontSize: 15,
  },
  optionInput: {
    borderWidth: 1,
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    borderColor: '#17a2b8',
    backgroundColor: '#ffffff',
    fontSize: 15,
  },
  correctAnswerInput: {
    borderWidth: 1,
    padding: 10,
    marginVertical: 5,
    borderRadius: 10,
    borderColor: '#28a745',
    backgroundColor: '#ffffff',
    fontSize: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  createButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 15,
    width: '40%',
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: { flex: 1, padding: 20, backgroundColor: '#f0f4f7' },
  quizItem: {
    backgroundColor: '#ffffff',
    marginVertical: 5,
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  quizText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  addButton: {
    backgroundColor: '#001933',
    position: 'absolute',
    bottom: 30,
    right: 30,
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  addButtonText: { color: '#fff', fontSize: 30 },
  questionContainer: {
    borderWidth: 1,
    borderColor: '#007BFF',
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },

});


export default QuizManagement;

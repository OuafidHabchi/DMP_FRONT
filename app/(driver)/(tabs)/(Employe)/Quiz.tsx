import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  FlatList
} from "react-native";
import AppURL from "@/components/src/URL";
import { useUser } from "@/context/UserContext";


interface Answer {
  questionText: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean; // ✅ Ajout de cette ligne
}

interface QuizAssignment {
  _id: string;
  assignmentId: string;
  title: string;
  status: 'pending' | 'completed';
  score?: number; // ✅ Ajout de la propriété facultative
}


const Quiz = () => {
  const { user, loadingContext } = useUser(); // ✅ Récupérer l'utilisateur depuis le contexte
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isReady, setIsReady] = useState(false); // Controls whether the test is displayed
  const [assignedQuizzes, setAssignedQuizzes] = useState<QuizAssignment[]>([]);
  const [showInstructions, setShowInstructions] = useState(false); // Par défaut, les instructions ne sont pas affichées
  const [selectedQuiz, setSelectedQuiz] = useState<QuizAssignment | null>(null); // Stocker le quiz sélectionné
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]); // Stocker les questions du quiz sélectionné
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignedQuizzes(); // Récupère à nouveau les quiz
    setRefreshing(false);
  };


  useEffect(() => {
    if (user?._id) {
      fetchAssignedQuizzes();
    }
  }, [user?._id]);



  const fetchAssignedQuizzes = async () => {
    try {
      const response = await axios.get(`${AppURL}/api/quiz/employee/${user?._id}?dsp_code=${user?.dsp_code}`);
      const quizzesWithAssignments = response.data.map((quiz: any) => ({
        ...quiz,
        assignmentId: quiz.assignmentId,
        score: quiz.score || null, // Assure la compatibilité avec la nouvelle propriété
      }));
      setAssignedQuizzes(quizzesWithAssignments);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer vos quiz assignés.');
    }
  };






  const handleSelectQuiz = async (quiz: QuizAssignment) => {
    if (quiz.status !== 'pending') return;

    try {
      const response = await axios.get(`${AppURL}/api/quiz/${quiz._id}?dsp_code=${user?.dsp_code}`);
      setQuizQuestions(response.data.questions || response.data.Questions || []);
      setSelectedQuiz(quiz);
      setShowInstructions(true);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les questions de ce quiz.');
    }
  };



  // Modifie la fonction handleAnswer pour attendre la mise à jour complète avant de soumettre
  const handleAnswer = (selectedOption: string) => {
    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isCorrect = selectedOption === currentQuestion.correctAnswer;

    // On calcule le score immédiatement
    const newScore = isCorrect ? score + 1 : score;

    const newAnswer: Answer = {
      questionText: currentQuestion?.questionText,
      selectedOption,
      correctAnswer: currentQuestion?.correctAnswer, // ✅ Bonne réponse exacte
      isCorrect: isCorrect,
    };

    setAnswers((prevAnswers) => {
      const updatedAnswers = [...prevAnswers, newAnswer];

      if (currentQuestionIndex === quizQuestions.length - 1) {
        finishQuiz(newScore, updatedAnswers);
      }

      return updatedAnswers;
    });

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setScore(newScore);
    }
  };




  // Modifie finishQuiz pour accepter answers comme paramètre
  const finishQuiz = (finalScore: number, finalAnswers: Answer[]) => {
    const calculatedScore = (finalAnswers.filter(answer => answer.isCorrect).length / finalAnswers.length) * 100;

    setIsFinished(true);
    setFinalScore(calculatedScore); // ✅ On enregistre le score final
    submitResults(finalAnswers, calculatedScore);
  };


  // Modifie submitResults pour recevoir answers comme argument
  const submitResults = async (finalAnswers: Answer[], calculatedScore: number) => {
    try {
      const payload = {
        assignmentId: selectedQuiz?.assignmentId,
        answers: finalAnswers,
        score: calculatedScore, // ✅ Envoie correctement le score
      };

      const response = await axios.post(
        `${AppURL}/api/quiz/result/submit?dsp_code=${user?.dsp_code}`,
        payload
      );

      if (response.status === 200) {
        Alert.alert("✅ Quiz soumis avec succès !");
      } else {
        Alert.alert("❌ Erreur lors de la soumission.");
      }
    } catch (error) {
      Alert.alert("⚠️ Erreur", "Impossible de soumettre les résultats.");
    }
  };


  const renderResult = () => {
    const percentage = finalScore ?? 0;

    return (
      <View style={styles.resultContainer}>
        <Text
          style={[
            styles.finalScore,
            percentage >= 80 ? styles.successScore : styles.failScore,
          ]}
        >
          {percentage >= 80
            ? `🎉 Your score: ${percentage.toFixed(2)}% 🎉`
            : `😞 Your score: ${percentage.toFixed(2)}% 😞`}
        </Text>

        <FlatList
          data={answers}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.resultList}
          renderItem={({ item }) => (
            <View
              style={[
                styles.resultCard,
                item.selectedOption === item.correctAnswer
                  ? styles.correctCard
                  : styles.incorrectCard,
              ]}
            >
              <Text style={styles.resultQuestion}>{item.questionText}</Text>
              <View style={styles.resultDetails}>
                <Text style={styles.resultText}>
                  Your answer: {item.selectedOption}
                </Text>
                <Text style={styles.correctAnswer}>
                  Correct answer: {item.correctAnswer}
                </Text>
              </View>
            </View>
          )}
        />
      </View>
    );
  };





  return (
    <View style={styles.container}>

      <Modal visible={showInstructions} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInstructions(false)}
            >
              <Text style={styles.closeButtonText}>X</Text>
            </TouchableOpacity>

            <ScrollView>
              <Text style={styles.instructionsTitle}>Instructions</Text>

              <Text style={styles.warningText}>
                ⚠️ You can take the test only once, so read the questions carefully (you need at least 80% to pass).{"\n"}{"\n"}
              </Text>

              <TouchableOpacity
                style={styles.startButton}
                onPress={() => {
                  setShowInstructions(false); // Fermer le modal d'instructions
                  setIsReady(true); // Lancer le quiz
                  setCurrentQuestionIndex(0); // Réinitialiser l'index des questions
                  setScore(0); // Réinitialiser le score
                }}
              >
                <Text style={styles.startButtonText}>I'm ready for the test</Text>
              </TouchableOpacity>


            </ScrollView>
          </View>
        </View>
      </Modal>

      {!isReady ? (


        <FlatList
          data={assignedQuizzes}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              disabled={item.status === 'completed'}
              onPress={() => handleSelectQuiz(item)}
              style={[styles.quizItem, { width: '100%' }]}
            >
              <Text style={styles.quizTitle}>{item.title}</Text>
              <Text style={styles.quizStatus}>
                {item.status === 'completed' ? `✅ Completed - Score: ${item.score ?? 0}%` : '🕒 Pending'}
              </Text>
            </TouchableOpacity>
          )}
          refreshing={refreshing}    // Ajoute l'état de rafraîchissement
          onRefresh={onRefresh}      // Ajoute la fonction à exécuter
        />






      ) : isFinished ? (
        renderResult()
      ) : (
        <View style={styles.questionBox}>
          {quizQuestions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < quizQuestions.length ? (
            <Text style={styles.questionText}>
              {quizQuestions[currentQuestionIndex]?.questionText}
            </Text>
          ) : (
            <Text style={styles.questionText}>Chargement des questions ou aucune question disponible...</Text>
          )}


          {quizQuestions[currentQuestionIndex]?.options.map((option: any, index: any) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

    </View>
  )
}


const styles = StyleSheet.create({
  quizItem: {
    padding: 15,
    marginVertical: 10,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  quizTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  quizStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },

  quizContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 20,
    marginVertical: 10,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },

  quizInfo: {
    flex: 1,
    marginRight: 10,
  },

  quizCompleted: {
    borderLeftColor: '#28a745',
  },

  quizPending: {
    borderLeftColor: '#FFA500',
  },

  scoreBox: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quizScore: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  quizContent: {
    flex: 1,
  },
  completed: {
    borderLeftColor: '#28a745',
  },

  pending: {
    borderLeftColor: '#FFA500',
  },

  quizCard: {
    padding: 20,
    marginVertical: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pendingQuiz: {
    backgroundColor: '#1E90FF',
  },

  completedQuiz: {
    backgroundColor: '#28a745',
  },



  resultContainer: {
    flex: 1,
    backgroundColor: "#001933", // Light background color
    padding: 16,
  },
  finalScore: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#34495e",
    textAlign: "center",
    marginBottom: 20,
  },
  resultList: {
    paddingBottom: 16, // Add padding to the bottom of the list
  },
  resultCard: {
    borderRadius: 10,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  correctCard: {
    backgroundColor: "#d4edda", // Light green for correct answers
    borderColor: "#c3e6cb",
    borderWidth: 1,
  },
  incorrectCard: {
    backgroundColor: "#f8d7da", // Light red for incorrect answers
    borderColor: "#f5c6cb",
    borderWidth: 1,
  },
  resultQuestion: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 8,
  },
  resultDetails: {
    marginTop: 8,
  },
  resultText: {
    fontSize: 16,
    color: "#212529",
    fontWeight: "600",
  },
  correctAnswer: {
    marginTop: 4,
    fontSize: 16,
    color: "#155724", // Dark green for correct answers
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)", // Semi-transparent background
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#001933",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  modalContainer: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  warningText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF0000", // Red warning text
    textAlign: "center",
    marginBottom: 15,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  instructionItemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#001933", // Blue titles for each instruction
    marginTop: 10,
    marginBottom: 5,
  },
  instructionsText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555",
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: "#001933",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  startButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  questionBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 25,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    alignItems: "center",
  },
  questionText: {
    fontSize: 20,
    color: "#333333",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: "#1E90FF",
    padding: 15,
    borderRadius: 25,
    marginVertical: 10,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  correct: {
    color: "#4CAF50",
  },
  incorrect: {
    color: "#FF5252",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#FF0000",
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 10, // Plus haut que le reste
    zIndex: 9999, // Priorité sur tout
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  viewInstructionsButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    backgroundColor: "red", // Blue button
    alignItems: "center",
    justifyContent: "center",
  },
  viewInstructionsButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 16,
    color: "#FFFFFF", // White text
    textAlign: "center",
    marginHorizontal: 20,
  },
  successScore: {
    color: "#28a745", // Green for scores >= 80
    fontWeight: "bold",
  },
  failScore: {
    color: "#dc3545", // Red for scores < 80
    fontWeight: "bold",
  },
});

export default Quiz;

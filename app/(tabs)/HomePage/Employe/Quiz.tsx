import React, { useState } from "react";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";

const URL_Quiz = "https://coral-app-wqv9l.ondigitalocean.app";
const URL_Employee = "https://coral-app-wqv9l.ondigitalocean.app";

interface Answer {
  question: string;
  selectedOption: string;
  correctAnswer: string;
}

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

const Quiz = () => {
  const route = useRoute();
  const { user } = route.params as { user: User };

  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isReady, setIsReady] = useState(false); // Controls whether the test is displayed


  const questions = [
    {
      id: 1,
      question: "What must you do before coming to work?",
      options: [
        "Activate your ADP account and download the app",
        "Check your equipment",
        "Start deliveries immediately",
        "Call your dispatcher",
      ],
      correctAnswer: "Activate your ADP account and download the app",
    },
    {
      id: 2,
      question: "What equipment must you have before starting?",
      options: [
        "Your Amazon uniform",
        "A casual outfit",
        "Any random clothing",
        "No special equipment is needed",
      ],
      correctAnswer: "Your Amazon uniform",
    },
    {
      id: 3,
      question: "Why is it important to be on time?",
      options: [
        "To respect the schedule and your team",
        "To leave early",
        "It doesn’t matter",
        "To check your equipment",
      ],
      correctAnswer: "To respect the schedule and your team",
    },
    {
      id: 4,
      question: "What should you do during the dispatcher’s meeting?",
      options: [
        "Listen carefully to the instructions",
        "Take a break",
        "Ignore the meeting",
        "Start deliveries early",
      ],
      correctAnswer: "Listen carefully to the instructions",
    },
    {
      id: 5,
      question: "What must you check with the provided equipment?",
      options: [
        "Ensure everything is complete and works",
        "Only check the phone",
        "Ignore the equipment check",
        "Use only the cables",
      ],
      correctAnswer: "Ensure everything is complete and works",
    },
    {
      id: 6,
      question: "How long should the vehicle inspection take?",
      options: [
        "At least 3 minutes",
        "1 minute",
        "No inspection is needed",
        "10 seconds",
      ],
      correctAnswer: "At least 3 minutes",
    },
    {
      id: 7,
      question: "What must you do before entering the assigned line?",
      options: [
        "Turn on flashers, lower windows, and drive at 8 km/h",
        "Drive as fast as possible",
        "Ignore the dispatcher’s instructions",
        "Park randomly",
      ],
      correctAnswer: "Turn on flashers, lower windows, and drive at 8 km/h",
    },
    {
      id: 8,
      question: "What should you do when the yard marshal gives you instructions?",
      options: [
        "Follow their instructions",
        "Ignore their directions",
        "Choose any spot you like",
        "Wait for someone else to act",
      ],
      correctAnswer: "Follow their instructions",
    },
    {
      id: 9,
      question: "When can you exit your vehicle?",
      options: [
        "After receiving the signal and observing others",
        "Immediately after parking",
        "Whenever you feel ready",
        "Once your dispatcher says so",
      ],
      correctAnswer: "After receiving the signal and observing others",
    },
    {
      id: 10,
      question: "How should you load your vehicle?",
      options: [
        "Follow the training instructions",
        "As fast as possible without checking",
        "Skip the loading step",
        "Load randomly",
      ],
      correctAnswer: "Follow the training instructions",
    },
    {
      id: 11,
      question: "What must you do after leaving the station?",
      options: [
        "Go directly to your first stop",
        "Take a break first",
        "Drive randomly before deliveries",
        "Wait for further instructions",
      ],
      correctAnswer: "Go directly to your first stop",
    },
    {
      id: 12,
      question: "Why are Amazon vehicles equipped with cameras?",
      options: [
        "To ensure driver safety",
        "To record for entertainment",
        "To monitor weather conditions",
        "To supervise loading",
      ],
      correctAnswer: "To ensure driver safety",
    },
    {
      id: 13,
      question: "What is the most important priority during your work?",
      options: [
        "Safety",
        "Speed",
        "Delivery quantity",
        "Time management",
      ],
      correctAnswer: "Safety",
    },
    {
      id: 14,
      question: "What should you do if you face difficulties on your first day?",
      options: [
        "Use the Virtual Dispatch for help",
        "Wait until the day is over",
        "Solve it on your own",
        "Skip the task",
      ],
      correctAnswer: "Use the Virtual Dispatch for help",
    },
    {
      id: 15,
      question: "Why must you take breaks?",
      options: [
        "To maintain your health and focus",
        "To avoid working",
        "It’s unnecessary to take breaks",
        "To relax for as long as you want",
      ],
      correctAnswer: "To maintain your health and focus",
    },
    {
      id: 16,
      question: "What should you do at the end of your route?",
      options: [
        "Call your dispatcher to confirm completion",
        "Go home without notifying anyone",
        "Ignore the dispatcher",
        "Take a break",
      ],
      correctAnswer: "Call your dispatcher to confirm completion",
    },
  ];

  // Function to handle copy
  const handleCopy = (text: string) => {
    Clipboard.setString(text);
    Alert.alert('Now paste it into your Virtual Dispatch to learn more.');
  };

  const handleAnswer = (selectedOption: string) => {
    const isCorrect =
      selectedOption === questions[currentQuestionIndex].correctAnswer;

    const newScore = isCorrect ? score + 1 : score;
    setScore(newScore);

    setAnswers((prevAnswers) => [
      ...prevAnswers,
      {
        question: questions[currentQuestionIndex].question,
        selectedOption,
        correctAnswer: questions[currentQuestionIndex].correctAnswer,
      },
    ]);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prevIndex) => prevIndex + 1);
    } else {
      finishQuiz(newScore);
    }
  };

  const finishQuiz = (finalScore: number) => {
    setIsFinished(true);
    const percentage = (finalScore / questions.length) * 100;
    saveResults(percentage);
  };

  const saveResults = async (percentage: number) => {
    try {
      const response = await axios.post(`${URL_Quiz}/api/quiz?dsp_code=${user.dsp_code}`, {
        employeeId: user._id,
        result: percentage,
        date: new Date().toISOString(),
      });

      if (response.status === 201) {
        console.log("Result saved successfully!");
        await axios.put(`${URL_Employee}/api/employee/profile/${user._id}?dsp_code=${user.dsp_code}`, {
          quiz: false,
        });
      } else {
        console.error("Error saving result", response.data);
      }
    } catch (error) {
      console.error("Error sending results", error);
      alert("An error occurred while saving results.");
    }
  };

  const renderResult = () => {
    const percentage = (score / questions.length) * 100;

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
          keyExtractor={(item, index) => index.toString()} // Use index as a key
          contentContainerStyle={styles.resultList} // Style for the list container
          renderItem={({ item }) => (
            <View
              style={[
                styles.resultCard,
                item.selectedOption === item.correctAnswer
                  ? styles.correctCard
                  : styles.incorrectCard,
              ]}
            >
              <Text style={styles.resultQuestion}>{item.question}</Text>
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
              <Text style={styles.warningText}>
                ⚠️ You can close this page and go to consult your virtual dispatch, and come back by clicking on the "X" button located in the top-right corner of this page.{"\n"}{"\n"}
                ⚠️ Read the instructions carefully and when you're sure you're ready for the test, click on the button at the bottom of the page.{"\n"}{"\n"}
                ⚠️ You can take the test only once, so read the instructions carefully (you need at least 80% to pass).{"\n"}{"\n"}
                📋 You can click on the instruction titles to copy them and use them as prompts in your virtual dispatch.
              </Text>
              <Text style={styles.instructionsTitle}>Instructions</Text>

              <View>
                <TouchableOpacity onLongPress={() => handleCopy("ADP Account")}>
                  <Text style={styles.instructionItemTitle}>1. ADP Account</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Activate your ADP account and download the app before coming to work.
                  (For more details, please refer to your virtual dispatch).
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Amazon Uniform")}>
                  <Text style={styles.instructionItemTitle}>2. Amazon Uniform</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Ensure you have you are following the amazon unufomr policy.
                  (For more details, please refer to your virtual dispatch).
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Punctuality")}>
                  <Text style={styles.instructionItemTitle}>3. Punctuality</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Be punctual, as it is very important.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Stand Up Meeting")}>
                  <Text style={styles.instructionItemTitle}>4. Stand Up Meeting</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Your dispatcher will hold a meeting to explain the delivery roles. Listen carefully.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Equipment Check")}>
                  <Text style={styles.instructionItemTitle}>5. Equipment Check</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Check that all equipment is complete and functioning correctly.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Vehicle Inspection")}>
                  <Text style={styles.instructionItemTitle}>6. Vehicle Inspection</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Inspect your vehicle (minimum 3 minutes) before leaving.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Entering the Line")}>
                  <Text style={styles.instructionItemTitle}>7. Entering the Line</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Follow your dispatcher’s instructions to align properly with flashers on, windows half-down, radio off, seatbelt on, and driving at 8 km/h.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Yard Marshal")}>
                  <Text style={styles.instructionItemTitle}>8. Yard Marshal</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  The yard marshal will direct you to a specific area and line. Follow their instructions.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Exiting the Vehicle")}>
                  <Text style={styles.instructionItemTitle}>9. Exiting the Vehicle</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Wait for the signal and observe colleagues before exiting the vehicle.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Loading")}>
                  <Text style={styles.instructionItemTitle}>10. Loading</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Load your vehicle following the instructions you learned during training.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Leaving the Station")}>
                  <Text style={styles.instructionItemTitle}>11. Leaving the Station</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  The yard marshal will guide you out of the station. Go directly to your first stop.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Cameras in Vehicles")}>
                  <Text style={styles.instructionItemTitle}>12. Cameras in Vehicles</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Amazon vehicles are equipped with cameras for your safety.
                  (For more details, please refer to your virtual dispatch).
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Safety First")}>
                  <Text style={styles.instructionItemTitle}>13. Safety First</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Safety is the top priority.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Facing Difficulties")}>
                  <Text style={styles.instructionItemTitle}>14. Facing Difficulties</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  if you are facing  any Difficulties Use the Virtual Dispatch for help or call your superviseur.
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("Breaks")}>
                  <Text style={styles.instructionItemTitle}>15. Breaks</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  Take your breaks; they are important for your health.
                  (For more details, please refer to your virtual dispatch).
                </Text>

                <TouchableOpacity onLongPress={() => handleCopy("End of Route")}>
                  <Text style={styles.instructionItemTitle}>16. End of Route</Text>
                </TouchableOpacity>
                <Text style={styles.instructionsText}>
                  At the end of your route, call your dispatcher to confirm you have finished and follow their instructions.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.startButton}
                onPress={() => {
                  setShowInstructions(false); // Close the modal
                  setIsReady(true); // Mark the user as ready to start the test
                }}

              >
                <Text style={styles.startButtonText}>I'm ready for the test</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Conditionally Render Test or Message */}
      {!isReady ? (
        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            Please read the instructions carefully and click "I'm ready for the test" to begin.
          </Text>
          {/* Button to Reopen Instructions */}
          <TouchableOpacity
            style={styles.viewInstructionsButton}
            onPress={() => setShowInstructions(true)}
          >
            <Text style={styles.viewInstructionsButtonText}>Back to Instructions</Text>
          </TouchableOpacity>
        </View>
      ) : isFinished ? (
        renderResult()
      ) : (
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>
            {questions[currentQuestionIndex].question}
          </Text>
          {questions[currentQuestionIndex].options.map((option, index) => (
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
};

const styles = StyleSheet.create({
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
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#FF0000", // Red background
    width: 30,
    height: 30,
    borderRadius: 15, // Circular button
    justifyContent: "center",
    alignItems: "center",
    elevation: 5, // Slight shadow for better visibility
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

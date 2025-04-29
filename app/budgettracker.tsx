import { useState, useEffect } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, ScrollView, Switch, Modal, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function BudgetTracker() {
  const { userName, subName, startMonth, startYear, duration, days, darkMode, groupCode: initialGroupCode } = useLocalSearchParams();
  const router = useRouter();
  const SERVER_URL = "https://birdlie.com:3000";
  
  const [isDarkMode, setIsDarkMode] = useState(darkMode === "true");
  const [isLoading, setIsLoading] = useState(false);
  const [budget, setBudget] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [newExpenseName, setNewExpenseName] = useState("");
  const [newExpenseAmount, setNewExpenseAmount] = useState("");
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [budgetSet, setBudgetSet] = useState(false);
  const [groupCode, setGroupCode] = useState(initialGroupCode);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalAction, setModalAction] = useState(null);

  useEffect(() => {
    const loadDarkMode = async () => {
      const storedMode = await AsyncStorage.getItem("darkMode");
      if (storedMode !== null) setIsDarkMode(JSON.parse(storedMode));
    };
    const loadGroupCode = async () => {
      const storedGroupCode = await AsyncStorage.getItem("groupCode");
      if (!initialGroupCode && storedGroupCode) {
        setGroupCode(storedGroupCode);
      }
    };
    loadDarkMode();
    loadGroupCode();
    fetchBudgetData();
  }, [initialGroupCode]);

  const fetchBudgetData = async () => {
    if (!groupCode) {
      console.log("Kein groupCode vorhanden, kann Budget-Daten nicht abrufen");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      console.log("Rufe Budget-Daten ab für groupCode:", groupCode);
      const response = await fetch(`${SERVER_URL}/group/${groupCode}`);
      const data = await response.json();
      console.log("Abgerufene Budget-Daten:", data);
      if (response.ok) {
        const budgetData = data.budgetTracker || {};
        const userBudgetData = budgetData[userName] || { budget: 0, expenses: [] };
        if (userBudgetData.budget) {
          setBudget(userBudgetData.budget.toString());
          setBudgetSet(true);
        }
        setExpenses(userBudgetData.expenses || []);
        calculateTotalExpenses(userBudgetData.expenses || []);
      } else {
        showModal("Fehler", data.error || "Konnte Budget-Daten nicht laden");
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Budget-Daten:", error);
      showModal("Fehler", "Der Server ist nicht erreichbar. Bitte überprüfe deine Internetverbindung oder versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const saveBudgetData = async (updatedExpenses, updatedBudget = budget) => {
    setIsLoading(true);
    try {
      console.log("Sende Anfrage an /update-budget-tracker:", { 
        code: groupCode, 
        userName, 
        budgetTracker: { budget: parseFloat(updatedBudget) || 0, expenses: updatedExpenses } 
      });
      const response = await fetch(`${SERVER_URL}/update-budget-tracker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: groupCode,
          userName,
          budgetTracker: {
            budget: parseFloat(updatedBudget) || 0,
            expenses: updatedExpenses
          }
        })
      });
      const data = await response.json();
      console.log("Server-Antwort (empfangen):", data);
      if (!response.ok) {
        showModal("Fehler", data.error || "Fehler beim Speichern des Budgets");
      }
    } catch (error) {
      showModal("Fehler", "Der Server ist nicht erreichbar. Bitte überprüfe deine Internetverbindung oder versuche es später erneut.");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalExpenses = (expenseList) => {
    const total = expenseList.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
    setTotalExpenses(total);
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem("darkMode", JSON.stringify(newMode));
  };

  const goBackToUrlaubsplanung = () => {
    console.log("Navigiere zurück zur Urlaubsplanung mit groupCode:", groupCode);
    router.push({
      pathname: "/urlaubsplanung",
      params: { userName, subName, startMonth, startYear, duration, days, darkMode: isDarkMode.toString(), groupCode }
    });
  };

  const setInitialBudget = () => {
    if (budget.trim() && !isNaN(parseFloat(budget)) && parseFloat(budget) > 0) {
      setBudgetSet(true);
      saveBudgetData(expenses);
    } else {
      showModal("Fehler", "Bitte gib ein gültiges Budget ein (z. B. 1000.50).");
    }
  };

  const addExpense = () => {
    if (newExpenseName.trim() && newExpenseAmount.trim() && !isNaN(parseFloat(newExpenseAmount)) && parseFloat(newExpenseAmount) >= 0) {
      const updatedExpenses = [...expenses, { name: newExpenseName.trim(), amount: parseFloat(newExpenseAmount) }];
      setExpenses(updatedExpenses);
      setNewExpenseName("");
      setNewExpenseAmount("");
      calculateTotalExpenses(updatedExpenses);
      saveBudgetData(updatedExpenses);
    } else {
      showModal("Hoppla", "Bitte gib einen gültigen Ausgaben-Namen und Betrag ein (z.B. Hotel, 200 Euro).");
    }
  };

  const deleteExpense = (index) => {
    const updatedExpenses = expenses.filter((_, i) => i !== index);
    setExpenses(updatedExpenses);
    calculateTotalExpenses(updatedExpenses);
    saveBudgetData(updatedExpenses);
  };

  const resetBudget = () => {
    showModal(
      "Budget zurücksetzen",
      "Möchtest du das Budget und alle Ausgaben wirklich zurücksetzen?",
      () => {
        setBudget("");
        setExpenses([]);
        setTotalExpenses(0);
        setBudgetSet(false);
        saveBudgetData([], "0");
      }
    );
  };

  const showModal = (title, message, onConfirm = null) => {
    setModalMessage({ title, message });
    setModalAction(() => onConfirm);
    setModalVisible(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8" }}>
      {isLoading && (
        <View style={{ 
          position: "absolute", 
          top: 0, 
          bottom: 0, 
          left: 0, 
          right: 0, 
          justifyContent: "center", 
          alignItems: "center",
          zIndex: 1
        }}>
          <ActivityIndicator size="small" color={isDarkMode ? "#60A5FA" : "#34D399"} />
        </View>
      )}
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: isDarkMode ? "#E2E8F0" : "#1F2937", letterSpacing: 2 }}>
            BIRD<Text style={{ color: "#F87171" }}>L</Text>IE <Text style={{ color: "#60A5FA" }}>BUDGET-TRACKER</Text>
          </Text>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#D1D5DB", true: "#60A5FA" }}
            thumbColor={isDarkMode ? "#F87171" : "#FFFFFF"}
            accessibilityLabel="Dunkelmodus umschalten"
          />
        </View>
        <Text style={{ fontSize: 16, fontWeight: "600", textAlign: "center", color: isDarkMode ? "#CBD5E0" : "#374151", marginBottom: 5 }}>
          {userName || "Unbekannt"}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: "500", textAlign: "center", color: isDarkMode ? "#A0AEC0" : "#6B7280", marginBottom: 20 }}>
          {subName || "Kein Reiseziel"}
        </Text>

        {!budgetSet ? (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 10 }}>
              Setze dein Gesamtbudget (in Euro):
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <TextInput
                placeholder="z. B. 1000.50"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                  marginRight: 10,
                  color: isDarkMode ? "#E2E8F0" : "#374151",
                }}
                placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
              />
              <Pressable
                onPress={setInitialBudget}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#34D399",
                  borderRadius: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Budget setzen</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 5 }}>
              Dein Budget: {parseFloat(budget).toFixed(2)} € | Ausgaben: {totalExpenses.toFixed(2)} €
            </Text>
            <Text style={{ fontSize: 14, color: totalExpenses > parseFloat(budget) ? "#EF4444" : "#34D399", marginBottom: 10 }}>
              {totalExpenses > parseFloat(budget) 
                ? `Du bist ${(totalExpenses - parseFloat(budget)).toFixed(2)} € über deinem Budget!`
                : `Du hast noch ${(parseFloat(budget) - totalExpenses).toFixed(2)} € übrig.`}
            </Text>
            <Pressable
              onPress={resetBudget}
              style={{
                alignSelf: "flex-start",
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: "#EF4444",
                borderRadius: 8,
                opacity: 0.7,
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}>Reset</Text>
            </Pressable>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
              <TextInput
                placeholder="Ausgabe (z. B. Hotel)"
                value={newExpenseName}
                onChangeText={setNewExpenseName}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                  marginRight: 10,
                  color: isDarkMode ? "#E2E8F0" : "#374151",
                }}
                placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
              />
              <TextInput
                placeholder="Betrag (z. B. 200 Euro)"
                value={newExpenseAmount}
                onChangeText={setNewExpenseAmount}
                keyboardType="numeric"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                  borderRadius: 12,
                  padding: 12,
                  fontSize: 16,
                  backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                  marginRight: 10,
                  color: isDarkMode ? "#E2E8F0" : "#374151",
                }}
                placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
              />
              <Pressable
                onPress={addExpense}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  backgroundColor: "#34D399",
                  borderRadius: 12,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Hinzufügen</Text>
              </Pressable>
            </View>

            {expenses.length > 0 ? (
              <View>
                <Text style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 10 }}>
                  Deine Ausgaben:
                </Text>
                {expenses.map((expense, index) => (
                  <View
                    key={index}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 10,
                      backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                      borderRadius: 8,
                      marginBottom: 10,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151" }}>
                      {expense.name}: {parseFloat(expense.amount).toFixed(2)} €
                    </Text>
                    <Pressable
                      onPress={() => deleteExpense(index)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        backgroundColor: "#EF4444",
                        borderRadius: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}>Löschen</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 20 }}>
                Du hast noch keine Ausgaben hinzugefügt.
              </Text>
            )}
          </View>
        )}

        <Pressable
          onPress={goBackToUrlaubsplanung}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: "#60A5FA",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            alignSelf: "center",
            marginTop: 20,
          }}
        >
          <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Zurück zur Urlaubsplanung</Text>
        </Pressable>
      </ScrollView>

      {/* Benutzerdefiniertes Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <View
            style={{
              width: "85%",
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              padding: 20,
              borderRadius: 16,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", textAlign: "center", marginBottom: 16 }}>
              {modalMessage.title}
            </Text>
            <Text style={{ fontSize: 16, color: isDarkMode ? "#CBD5E0" : "#374151", textAlign: "center", marginBottom: 20 }}>
              {modalMessage.message}
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  paddingHorizontal: 20,
                  backgroundColor: isDarkMode ? "#4A5568" : "#E5E7EB",
                  borderRadius: 12,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151", fontWeight: "600" }}>Abbrechen</Text>
              </Pressable>
              {modalAction && (
                <Pressable
                  onPress={() => {
                    modalAction();
                    setModalVisible(false);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 16,
                    paddingHorizontal: 20,
                    backgroundColor: modalMessage.title === "Budget zurücksetzen" ? "#EF4444" : "#34D399",
                    borderRadius: 12,
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: "#FFFFFF",
                      fontWeight: "600",
                      textAlign: "center",
                      numberOfLines: 1,
                    }}
                  >
                    {modalMessage.title === "Budget zurücksetzen" ? "Zurücksetzen" : "OK"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
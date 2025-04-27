import { useState, useEffect } from "react";
import { SafeAreaView, View, Text, TextInput, Pressable, ScrollView, Switch, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Packliste() {
  const { userName, subName, startMonth, startYear, duration, darkMode, groupCode } = useLocalSearchParams();
  const router = useRouter();
  const SERVER_URL = "https://birdlie.com:3000";

  const [isDarkMode, setIsDarkMode] = useState(darkMode === "true");
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    const loadDarkMode = async () => {
      const storedMode = await AsyncStorage.getItem("darkMode");
      if (storedMode !== null) setIsDarkMode(JSON.parse(storedMode));
    };
    loadDarkMode();
    fetchPackingList();
  }, []);

  const fetchPackingList = async () => {
    try {
      const response = await fetch(`${SERVER_URL}/group/${groupCode}`);
      const data = await response.json();
      if (response.ok) {
        // Konvertiere die gespeicherten Items in das neue Format mit checked-Status
        const savedItems = data.packingList || [];
        const formattedItems = savedItems.map(item => ({
          name: typeof item === "string" ? item : item.name,
          checked: typeof item === "string" ? false : item.checked || false
        }));
        setItems(formattedItems);
      } else {
        Alert.alert("Fehler", data.error || "Konnte Gepäckliste nicht laden");
      }
    } catch (error) {
      Alert.alert("Fehler", "Der Server ist nicht erreichbar. Bitte überprüfe deine Internetverbindung oder versuche es später erneut.");
    }
  };

  const savePackingList = async (updatedItems) => {
    try {
      const response = await fetch(`${SERVER_URL}/update-packing-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: groupCode,
          packingList: updatedItems
        })
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Fehler", data.error || "Fehler beim Speichern der Gepäckliste");
      }
    } catch (error) {
      Alert.alert("Fehler", "Der Server ist nicht erreichbar. Bitte überprüfe deine Internetverbindung oder versuche es später erneut.");
    }
  };

  const addItem = () => {
    if (newItem.trim()) {
      const updatedItems = [...items, { name: newItem.trim(), checked: false }];
      setItems(updatedItems);
      setNewItem("");
      savePackingList(updatedItems);
    } else {
      Alert.alert("Fehler", "Bitte gib einen gültigen Gegenstand ein.");
    }
  };

  const deleteItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
    savePackingList(updatedItems);
  };

  const toggleItemChecked = (index) => {
    const updatedItems = [...items];
    updatedItems[index].checked = !updatedItems[index].checked;
    setItems(updatedItems);
    savePackingList(updatedItems);
  };

  const toggleDarkMode = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    await AsyncStorage.setItem("darkMode", JSON.stringify(newMode));
  };

  const goBackToUrlaubsplanung = () => {
    router.push({
      pathname: "/urlaubsplanung",
      params: { userName, subName, startMonth, startYear, duration, darkMode: isDarkMode.toString(), groupCode }
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "900", color: isDarkMode ? "#E2E8F0" : "#1F2937", letterSpacing: 2 }}>
            BIRD<Text style={{ color: "#F87171" }}>L</Text>IE <Text style={{ color: "#60A5FA" }}>GEPÄCKLISTE</Text>
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

        <Text style={{ fontSize: 18, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 10 }}>
          Neuer Gegenstand:
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 20 }}>
          <TextInput
            placeholder="Gegenstand (z. B. Zahnbürste)"
            value={newItem}
            onChangeText={setNewItem}
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
            onPress={addItem}
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

        {items.length > 0 ? (
          <View>
            <Text style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#374151", marginBottom: 10 }}>
              Deine Gepäckliste:
            </Text>
            {items.map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderBottomWidth: index === items.length - 1 ? 0 : 1,
                  borderColor: isDarkMode ? "#4A5568" : "#E5E7EB",
                }}
              >
                <Switch
                  value={item.checked}
                  onValueChange={() => toggleItemChecked(index)}
                  trackColor={{ false: "#D1D5DB", true: "#34D399" }}
                  thumbColor={isDarkMode ? "#F87171" : "#FFFFFF"}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    color: isDarkMode ? "#CBD5E0" : "#374151",
                    textDecorationLine: item.checked ? "line-through" : "none",
                  }}
                >
                  {item.name}
                </Text>
                <Pressable
                  onPress={() => deleteItem(index)}
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
            Du hast noch keine Gegenstände hinzugefügt.
          </Text>
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
    </SafeAreaView>
  );
}
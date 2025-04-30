import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image } from "react-native";
import { MotiView, AnimatePresence } from "moti";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { Picker } from "@react-native-picker/picker";
import BirdlieSplash from "../components/BirdlieSplash";
import { Alert } from "react-native";

export default function Home() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [showChoice, setShowChoice] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [showCopyPopup, setShowCopyPopup] = useState(false);
  const [name, setName] = useState("");
  const [subName, setSubName] = useState("");
  const [startMonth, setStartMonth] = useState("April");
  const [startYear, setStartYear] = useState("2025");
  const [duration, setDuration] = useState("1 Monat");
  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMonthPickerVisible, setMonthPickerVisible] = useState(false);
  const [isYearPickerVisible, setYearPickerVisible] = useState(false);
  const [serverStatus, setServerStatus] = useState("Prüfe Server...");

  const SERVER_URL = "https://birdlie.com:3000";
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const years = ["2025", "2026", "2027"];

  useEffect(() => {
    const loadDarkMode = async () => {
      const storedMode = await AsyncStorage.getItem("darkMode");
      if (storedMode !== null) setIsDarkMode(JSON.parse(storedMode));
    };
    loadDarkMode();

    const testServer = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/group/test`, {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        });
        const data = await response.json();
        setServerStatus("Server erreichbar!");
      } catch (error) {
        setServerStatus(`Server nicht erreichbar: ${error.message}`);
      }
    };
    testServer();

    const splashTimer = setTimeout(() => {
      setShowSplash(false);
      setShowChoice(true);
    }, 3500);
    return () => clearTimeout(splashTimer);
  }, []);

  const handleCreateGroup = () => {
    setShowChoice(false);
    setShowCreateGroup(true);
  };

  const handleJoinGroup = () => {
    setShowChoice(false);
    setShowJoinGroup(true);
  };

  const handleBackToChoice = () => {
    setShowCreateGroup(false);
    setShowJoinGroup(false);
    setShowChoice(true);
  };

  const handleCreateSubmit = async () => {
    if (name.trim() && subName.trim()) {
      try {
        const response = await fetch(`${SERVER_URL}/create-group`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, subName, startMonth, startYear, duration })
        });
        const data = await response.json();
        if (response.ok) {
          await AsyncStorage.setItem("userName", name);
          await AsyncStorage.setItem("groupCode", data.code);
          setGroupCode(data.code);
          setShowCreateGroup(false);
          setShowCodePopup(true);
        } else {
          Alert.alert("Fehler", data.error || "Gruppe konnte nicht erstellt werden");
        }
      } catch (error) {
        Alert.alert("Fehler", "Server nicht erreichbar: " + error.message);
      }
    } else {
      Alert.alert("Fehler", "Bitte gib einen Namen und ein Reiseziel ein.");
    }
  };

  const handleCodeConfirm = async () => {
    setShowCodePopup(false);
    router.push({
      pathname: "/kalender",
      params: { 
        userName: name, 
        subName, 
        startMonth, 
        startYear, 
        duration, 
        darkMode: isDarkMode.toString(), 
        groupCode 
      }
    });
  };

  const copyCodeToClipboard = async () => {
    try {
      await Clipboard.setStringAsync(groupCode);
      setShowCopyPopup(true);
      setTimeout(() => setShowCopyPopup(false), 3000);
    } catch (error) {
      Alert.alert("Fehler", "Kopieren fehlgeschlagen: " + error.message);
    }
  };

  const handleJoinSubmit = async () => {
    if (joinName.trim() && joinCode.trim()) {
      try {
        const response = await fetch(`${SERVER_URL}/join-group`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: joinName, code: joinCode })
        });
        const data = await response.json();
        if (response.ok) {
          await AsyncStorage.setItem("userName", joinName);
          await AsyncStorage.setItem("groupCode", joinCode);
          router.push({
            pathname: "/kalender",
            params: {
              userName: joinName,
              subName: data.subName,
              startMonth: data.startMonth,
              startYear: data.startYear,
              duration: data.duration,
              darkMode: isDarkMode.toString(),
              groupCode: joinCode
            }
          });
        } else {
          Alert.alert("Fehler", data.error || "Ungültiger Code");
        }
      } catch (error) {
        Alert.alert("Fehler", "Server nicht erreichbar: " + error.message);
      }
    } else {
      Alert.alert("Fehler", "Bitte gib einen Namen und einen gültigen Code ein.");
    }
  };

  const showMonthPicker = () => {
    setMonthPickerVisible(true);
    setYearPickerVisible(false);
  };

  const showYearPicker = () => {
    setYearPickerVisible(true);
    setMonthPickerVisible(false);
  };

  if (showSplash) {
    return (
      <View style={{ flex: 1 }}>
        <BirdlieSplash />
      </View>
    );
  }

  if (showChoice) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8", padding: 20 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Image source={require("../assets/birdlie-logo.png")} style={{ width: 120, height: 120 }} resizeMode="contain" />
          <MotiView from={{ rotate: "0deg" }} animate={{ rotate: ["0deg", "5deg", "-5deg", "0deg"] }} transition={{ loop: true, duration: 1000 }} style={{ position: "absolute", bottom: 35, right: 10 }}>
            <Image source={require("../assets/birdlie-suitcase.png")} style={{ width: 40, height: 40 }} resizeMode="contain" />
          </MotiView>
        </View>
        <Text style={{ fontSize: 28, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 20, textAlign: "center" }}>
          Was möchtest du tun?
        </Text>
        <Text style={{ fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151", marginBottom: 20, textAlign: "center" }}>
          {serverStatus}
        </Text>
        <TouchableOpacity
          onPress={handleCreateGroup}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: "#34D399",
            borderRadius: 12,
            marginBottom: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            width: "80%",
            alignItems: "center"
          }}
        >
          <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Reisegruppe erstellen</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleJoinGroup}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 24,
            backgroundColor: "#60A5FA",
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            width: "80%",
            alignItems: "center"
          }}
        >
          <Text style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "600" }}>Reisegruppe beitreten</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showCreateGroup) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8" }}>
        <ScrollView contentContainerStyle={{ justifyContent: "center", alignItems: "center", padding: 20, flexGrow: 1 }}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Image source={require("../assets/birdlie-logo.png")} style={{ width: 120, height: 120 }} resizeMode="contain" />
            <MotiView from={{ rotate: "0deg" }} animate={{ rotate: ["0deg", "5deg", "-5deg", "0deg"] }} transition={{ loop: true, duration: 1000 }} style={{ position: "absolute", bottom: 35, right: 10 }}>
              <Image source={require("../assets/birdlie-suitcase.png")} style={{ width: 40, height: 40 }} resizeMode="contain" />
            </MotiView>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 20 }}>
            Wie heißt du?
          </Text>
          <TextInput
            placeholder="Dein Name"
            value={name}
            onChangeText={setName}
            style={{
              width: "80%",
              borderWidth: 1,
              borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              marginBottom: 20,
              color: isDarkMode ? "#E2E8F0" : "#374151",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
          />
          <Text style={{ fontSize: 24, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 20 }}>
            Reiseziel für den Kalender
          </Text>
          <TextInput
            placeholder="z. B. Kroatien"
            value={subName}
            onChangeText={setSubName}
            style={{
              width: "80%",
              borderWidth: 1,
              borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              marginBottom: 20,
              color: isDarkMode ? "#E2E8F0" : "#374151",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
          />
          <Text style={{ fontSize: 24, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 10 }}>
            Startmonat wählen
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "80%", marginBottom: 20 }}>
            <TouchableOpacity
              onPress={showMonthPicker}
              style={{
                width: "50%",
                borderWidth: 1,
                borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                borderRadius: 12,
                padding: 12,
                backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                marginRight: 10,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151" }}>{startMonth}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={showYearPicker}
              style={{
                width: "30%",
                borderWidth: 1,
                borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                borderRadius: 12,
                padding: 12,
                backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151" }}>{startYear}</Text>
            </TouchableOpacity>
          </View>
          {isMonthPickerVisible && (
            <View style={{
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              borderRadius: 25,
              padding: 10,
              marginVertical: 10,
              width: "60%",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 5, textAlign: "center" }}>
                Monat auswählen
              </Text>
              <Picker
                selectedValue={startMonth}
                onValueChange={(itemValue) => {
                  setStartMonth(itemValue);
                  setMonthPickerVisible(false);
                }}
                style={{ width: "100%", height: 60 }}
                itemStyle={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151" }}
              >
                {monthNames.map((month, index) => (
                  <Picker.Item key={index} label={month} value={month} />
                ))}
              </Picker>
              <TouchableOpacity
                onPress={() => setMonthPickerVisible(false)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  backgroundColor: "#60A5FA",
                  borderRadius: 10,
                  alignSelf: "center",
                  marginTop: 2,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "600" }}>Schließen</Text>
              </TouchableOpacity>
            </View>
          )}
          {isYearPickerVisible && (
            <View style={{
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              borderRadius: 25,
              padding: 10,
              marginVertical: 10,
              width: "60%",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 6,
              elevation: 3,
            }}>
              <Text style={{ fontSize: 18, fontWeight: "600", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 5, textAlign: "center" }}>
                Jahr auswählen
              </Text>
              <Picker
                selectedValue={startYear}
                onValueChange={(itemValue) => {
                  setStartYear(itemValue);
                  setYearPickerVisible(false);
                }}
                style={{ width: "100%", height: 60 }}
                itemStyle={{ fontSize: 16, color: isDarkMode ? "#E2E8F0" : "#374151" }}
              >
                {years.map((year, index) => (
                  <Picker.Item key={index} label={year} value={year} />
                ))}
              </Picker>
              <TouchableOpacity
                onPress={() => setYearPickerVisible(false)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  backgroundColor: "#60A5FA",
                  borderRadius: 10,
                  alignSelf: "center",
                  marginTop: 2,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }}
              >
                <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "600" }}>Schließen</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={{ fontSize: 24, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 10 }}>
            Dauer wählen
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", width: "80%", marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => setDuration("1 Monat")}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: duration === "1 Monat" ? "#34D399" : (isDarkMode ? "#2D3748" : "#FFFFFF"),
                borderWidth: 1,
                borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                borderRadius: 12,
                marginRight: 10,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 16, color: duration === "1 Monat" ? "#FFFFFF" : (isDarkMode ? "#E2E8F0" : "#374151"), fontWeight: "600" }}>
                1 Monat
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setDuration("2 Monate")}
              style={{
                flex: 1,
                paddingVertical: 12,
                backgroundColor: duration === "2 Monate" ? "#34D399" : (isDarkMode ? "#2D3748" : "#FFFFFF"),
                borderWidth: 1,
                borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
                borderRadius: 12,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 16, color: duration === "2 Monate" ? "#FFFFFF" : (isDarkMode ? "#E2E8F0" : "#374151"), fontWeight: "600" }}>
                2 Monate
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            onPress={handleCreateSubmit}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: name.trim() && subName.trim() ? "#34D399" : "#E5E7EB",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              width: "80%",
              alignItems: "center"
            }}
          >
            <Text style={{ fontSize: 16, color: name.trim() && subName.trim() ? "#FFFFFF" : "#6B7280", fontWeight: "600" }}>
              Gruppe erstellen
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBackToChoice}
            style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 14, color: isDarkMode ? "#A0AEC0" : "#6B7280", textDecorationLine: "underline" }}>
              Zugangscode?
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (showCodePopup) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
        <MotiView
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ type: "timing", duration: 200 }}
          style={{
            width: "80%",
            backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
            padding: 20,
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            alignItems: "center"
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 10, textAlign: "center" }}>
            Gruppe erstellt!
          </Text>
          <Text style={{ fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151", marginBottom: 10, textAlign: "center" }}>
            Wichtig-Zugangscode für deine Freunde:
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "600", color: isDarkMode ? "#60A5FA" : "#34D399", textAlign: "center", marginBottom: 20 }}>
            {groupCode}
          </Text>
          <TouchableOpacity
            onPress={copyCodeToClipboard}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: "#60A5FA",
              borderRadius: 12,
              marginBottom: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              width: "80%",
              alignItems: "center"
            }}
          >
            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "600" }}>Code kopieren</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCodeConfirm}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: "#34D399",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              width: "80%",
              alignItems: "center"
            }}
          >
            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "600" }}>Fortfahren</Text>
          </TouchableOpacity>
        </MotiView>

        <AnimatePresence>
          {showCopyPopup && (
            <MotiView
              from={{ opacity: 0, scale: 0.8, translateY: 20 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              exit={{ opacity: 0, scale: 0.8, translateY: 20 }}
              transition={{ type: "spring", duration: 300 }}
              style={{
                position: "absolute",
                bottom: 100,
                backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
                padding: 16,
                borderRadius: 20,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                width: 300,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: isDarkMode ? "#60A5FA" : "#34D399", marginBottom: 4 }}>
                Birdlie-Code gesichert!
              </Text>
              <Text style={{ fontSize: 14, color: isDarkMode ? "#CBD5E0" : "#374151", textAlign: "center" }}>
                Dein Gruppencode ist in der Zwischenablage – teile ihn mit deinen Freunden!
              </Text>
            </MotiView>
          )}
        </AnimatePresence>
      </View>
    );
  }

  if (showJoinGroup) {
    return (
      <View style={{ flex: 1, backgroundColor: isDarkMode ? "#1A202C" : "#F0F4F8" }}>
        <ScrollView contentContainerStyle={{ justifyContent: "center", alignItems: "center", padding: 20, flexGrow: 1 }}>
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <Image source={require("../assets/birdlie-logo.png")} style={{ width: 120, height: 120 }} resizeMode="contain" />
            <MotiView from={{ rotate: "0deg" }} animate={{ rotate: ["0deg", "5deg", "-5deg", "0deg"] }} transition={{ loop: true, duration: 1000 }} style={{ position: "absolute", bottom: 35, right: 10 }}>
              <Image source={require("../assets/birdlie-suitcase.png")} style={{ width: 40, height: 40 }} resizeMode="contain" />
            </MotiView>
          </View>
          <Text style={{ fontSize: 24, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 20 }}>
            Wie heißt du?
          </Text>
          <TextInput
            placeholder="Dein Name"
            value={joinName}
            onChangeText={setJoinName}
            style={{
              width: "80%",
              borderWidth: 1,
              borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              marginBottom: 20,
              color: isDarkMode ? "#E2E8F0" : "#374151",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
          />
          <Text style={{ fontSize: 24, fontWeight: "700", color: isDarkMode ? "#E2E8F0" : "#1F2937", marginBottom: 20 }}>
            Gruppen-Code eingeben
          </Text>
          <TextInput
            placeholder="8-stelliger Code"
            value={joinCode}
            onChangeText={setJoinCode}
            maxLength={8}
            style={{
              width: "80%",
              borderWidth: 1,
              borderColor: isDarkMode ? "#4A5568" : "#D1D5DB",
              borderRadius: 12,
              padding: 12,
              fontSize: 16,
              backgroundColor: isDarkMode ? "#2D3748" : "#FFFFFF",
              marginBottom: 20,
              color: isDarkMode ? "#E2E8F0" : "#374151",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            }}
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#6B7280"}
          />
          <TouchableOpacity
            onPress={handleJoinSubmit}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: joinName.trim() && joinCode.trim().length === 8 ? "#60A5FA" : "#E5E7EB",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              width: "80%",
              alignItems: "center"
            }}
          >
            <Text style={{ fontSize: 16, color: joinName.trim() && joinCode.trim().length === 8 ? "#FFFFFF" : "#6B7280", fontWeight: "600" }}>
              Gruppe beitreten
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleBackToChoice}
            style={{ marginTop: 10, paddingVertical: 8, paddingHorizontal: 16 }}
          >
            <Text style={{ fontSize: 14, color: isDarkMode ? "#A0AEC0" : "#6B7280", textDecorationLine: "underline" }}>
              Gruppe erstellen?
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}
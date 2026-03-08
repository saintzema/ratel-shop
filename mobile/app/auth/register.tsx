import { useState } from "react";
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../src/stores/authStore";

export default function RegisterScreen() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const register = useAuthStore((s) => s.register);

    const handleRegister = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter your name");
            return;
        }
        if (!email.trim()) {
            Alert.alert("Error", "Please enter your email");
            return;
        }
        setLoading(true);
        try {
            await register(name.trim(), email.trim(), password || undefined);
            router.back();
        } catch (err: any) {
            const msg = err?.response?.data?.error || "Registration failed. Please try again.";
            Alert.alert("Registration Failed", msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.inner}
            >
                <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>

                <View style={styles.header}>
                    <Text style={styles.logo}>FairPrice</Text>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join and start saving on every purchase</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputWrap}>
                        <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.input}
                            placeholder="Full name"
                            placeholderTextColor="#9CA3AF"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.inputWrap}>
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.input}
                            placeholder="Email address"
                            placeholderTextColor="#9CA3AF"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.inputWrap}>
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.input}
                            placeholder="Password (optional)"
                            placeholderTextColor="#9CA3AF"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                color="#9CA3AF"
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitBtnText}>Create Account</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.switchWrap}
                    onPress={() => {
                        router.back();
                        setTimeout(() => router.push("/auth/login"), 100);
                    }}
                >
                    <Text style={styles.switchText}>
                        Already have an account? <Text style={styles.switchLink}>Sign In</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FFF" },
    inner: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
    closeBtn: {
        position: "absolute", top: 16, right: 0,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center",
    },
    header: { alignItems: "center", marginBottom: 40 },
    logo: { fontSize: 32, fontWeight: "900", color: "#059669", letterSpacing: -1 },
    title: { fontSize: 22, fontWeight: "800", color: "#1F2937", marginTop: 16 },
    subtitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
    form: { gap: 14 },
    inputWrap: {
        flexDirection: "row", alignItems: "center", gap: 12,
        backgroundColor: "#F9FAFB", paddingHorizontal: 16, paddingVertical: 14,
        borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB",
    },
    input: { flex: 1, fontSize: 15, color: "#1F2937" },
    submitBtn: {
        backgroundColor: "#059669", paddingVertical: 16, borderRadius: 14,
        alignItems: "center", marginTop: 8,
    },
    submitBtnText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
    switchWrap: { alignItems: "center", marginTop: 24 },
    switchText: { fontSize: 14, color: "#6B7280" },
    switchLink: { fontWeight: "700", color: "#059669" },
});

import { Redirect } from "expo-router";

// Esta tela não é mais usada — redireciona para a home.
// O login Google será implementado na fase de build EAS.
export default function LoginScreen() {
  return <Redirect href="/" />;
}

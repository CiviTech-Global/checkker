import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BotConfiguration, BotMaturity } from "@checkker/shared";
import { deserializeBotConfig, deserializeBotMaturity, serializeBotConfig, serializeBotMaturity } from "@checkker/shared";

const CONFIG_KEY = "checkker:bot:config";
const MATURITY_KEY = "checkker:bot:maturity";

export async function loadBotConfig(): Promise<BotConfiguration> {
  const json = await AsyncStorage.getItem(CONFIG_KEY);
  return deserializeBotConfig(json);
}

export async function saveBotConfig(config: BotConfiguration): Promise<void> {
  await AsyncStorage.setItem(CONFIG_KEY, serializeBotConfig(config));
}

export async function loadBotMaturity(): Promise<BotMaturity> {
  const json = await AsyncStorage.getItem(MATURITY_KEY);
  return deserializeBotMaturity(json);
}

export async function saveBotMaturity(maturity: BotMaturity): Promise<void> {
  await AsyncStorage.setItem(MATURITY_KEY, serializeBotMaturity(maturity));
}

export async function clearBotStorage(): Promise<void> {
  await AsyncStorage.multiRemove([CONFIG_KEY, MATURITY_KEY]);
}

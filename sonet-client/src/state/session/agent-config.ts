import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'agent-labelers'

export async function saveLabelers(userId: string, value: string[]) {
  await AsyncStorage.setItem(`${PREFIX}:${userId}`, JSON.stringify(value))
}

export async function readLabelers(userId: string): Promise<string[] | undefined> {
  const rawData = await AsyncStorage.getItem(`${PREFIX}:${userId}`)
  return rawData ? JSON.parse(rawData) : undefined
}

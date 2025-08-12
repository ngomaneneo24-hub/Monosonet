import React from 'react'
import {render, screen} from '@testing-library/react-native'
import {SonetChatsScreen} from './SonetChatsScreen'

// Mock the navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}))

// Mock the hooks
jest.mock('#/lib/hooks/useAppState', () => ({
  useAppState: jest.fn(),
}))

jest.mock('#/components/hooks/useRefreshOnFocus', () => ({
  useRefreshOnFocus: jest.fn(),
}))

jest.mock('#/state/queries/messages/sonet', () => ({
  useSonetListConvos: () => ({
    state: {
      chats: [],
      isLoading: false,
      error: null,
    },
    actions: {
      refreshChats: jest.fn(),
    },
  }),
}))

jest.mock('#/components/ageAssurance/useAgeAssuranceCopy', () => ({
  useAgeAssuranceCopy: () => ({
    chatsInfoText: 'Test info text',
  }),
}))

jest.mock('@lingui/react', () => ({
  useLingui: () => ({
    _: (id: string) => id,
  }),
}))

describe('SonetChatsScreen', () => {
  it('renders without crashing', () => {
    render(<SonetChatsScreen />)
    expect(screen.getByTestId('sonetChatsScreen')).toBeTruthy()
  })

  it('displays the search bar', () => {
    render(<SonetChatsScreen />)
    expect(screen.getByPlaceholderText('Search chats...')).toBeTruthy()
  })

  it('displays filter tabs', () => {
    render(<SonetChatsScreen />)
    expect(screen.getByText('All')).toBeTruthy()
    expect(screen.getByText('Direct')).toBeTruthy()
    expect(screen.getByText('Groups')).toBeTruthy()
    expect(screen.getByText('Requests')).toBeTruthy()
    expect(screen.getByText('Archived')).toBeTruthy()
  })
})
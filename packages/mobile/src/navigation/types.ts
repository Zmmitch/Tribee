import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainTabParamList = {
  TripsTab: NavigatorScreenParams<TripStackParamList>;
  Activity: undefined;
  Profile: undefined;
};

export type TripStackParamList = {
  TripsList: undefined;
  CreateTrip: undefined;
  TripDashboard: { tripId: string };
  Itinerary: { tripId: string };
  AddItineraryItem: { tripId: string };
  Polls: { tripId: string };
  CreatePoll: { tripId: string };
  PollDetail: { tripId: string; pollId: string };
  Expenses: { tripId: string };
  AddExpense: { tripId: string };
  Settlements: { tripId: string };
  Vault: { tripId: string };
  UploadDoc: { tripId: string };
  Members: { tripId: string };
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends TripStackParamList {}
  }
}

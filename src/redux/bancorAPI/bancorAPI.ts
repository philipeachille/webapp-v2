import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getWelcomeData, WelcomeData } from 'api/bancor';

interface ViewToken {
  symbol: string;
  name: string;
  logoURI: string;
}

interface ViewPool {}

interface InitialState {
  welcomeData: WelcomeData;
  tokens: ViewToken[];
  pools: ViewPool[];
}

export const initialState: InitialState = {
  welcomeData: {
    total_liquidity: { usd: null },
    total_volume_24h: { usd: null },
    bnt_price_24h_ago: { usd: null },
    bnt_price: { usd: null },
    bnt_supply: '',
    swaps: [],
    pools: [],
    tokens: [],
  },
  tokens: [],
  pools: [],
};

export const fetchWelcomeData = createAsyncThunk(
  'bancorAPI/fetchWelcomeData',
  async () => {
    return await getWelcomeData();
  }
);

const userSlice = createSlice({
  name: 'bancorAPI',
  initialState,
  reducers: {
    setWelcomeData: (bancorAPI, action) => {
      bancorAPI.welcomeData = action.payload;
    },
    setTokens: (state, action) => {
      state.welcomeData.tokens = action.payload;
    },
    setPools: (state, action) => {
      state.welcomeData.pools = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchWelcomeData.fulfilled, (state, action) => {
      state.welcomeData = action.payload;
    });
  },
});

export const { setWelcomeData, setTokens, setPools } = userSlice.actions;

export const bancorAPI = userSlice.reducer;
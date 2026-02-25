export interface IovValues {
  units: string;
  market: {
    cash_equities: number | null;
    bonds: number | null;
    derivatives_notional: number | null;
    total: number | null;
  };
  state: {
    global_gdp: number | null;
    total: number | null;
  };
  community: {
    nonprofit_sector_estimate: number | null;
    coops_mutuals_estimate: number | null;
    household_unpaid_estimate: number | null;
    total: number | null;
  };
  notes: {
    sources: string[];
    last_updated: string | null;
  };
}

export const DEFAULT_IOV_VALUES: IovValues = {
  units: "USD_trillions",
  market: {
    cash_equities: null,
    bonds: null,
    derivatives_notional: null,
    total: null,
  },
  state: {
    global_gdp: null,
    total: null,
  },
  community: {
    nonprofit_sector_estimate: null,
    coops_mutuals_estimate: null,
    household_unpaid_estimate: null,
    total: null,
  },
  notes: {
    sources: [],
    last_updated: null,
  },
};

let cachedIovValues: IovValues | null = null;
let pendingIovValuesLoad: Promise<IovValues> | null = null;

export const loadIovValues = async (): Promise<IovValues> => {
  if (cachedIovValues) return cachedIovValues;
  if (pendingIovValuesLoad) return pendingIovValuesLoad;

  pendingIovValuesLoad = (async () => {
    try {
      const response = await fetch("/data/iov_values.json", { cache: "force-cache" });
      if (!response.ok) {
        cachedIovValues = DEFAULT_IOV_VALUES;
        return cachedIovValues;
      }
      const data = (await response.json()) as Partial<IovValues>;
      cachedIovValues = {
        units: data.units ?? DEFAULT_IOV_VALUES.units,
        market: {
          cash_equities: data.market?.cash_equities ?? null,
          bonds: data.market?.bonds ?? null,
          derivatives_notional: data.market?.derivatives_notional ?? null,
          total: data.market?.total ?? null,
        },
        state: {
          global_gdp: data.state?.global_gdp ?? null,
          total: data.state?.total ?? null,
        },
        community: {
          nonprofit_sector_estimate: data.community?.nonprofit_sector_estimate ?? null,
          coops_mutuals_estimate: data.community?.coops_mutuals_estimate ?? null,
          household_unpaid_estimate: data.community?.household_unpaid_estimate ?? null,
          total: data.community?.total ?? null,
        },
        notes: {
          sources: Array.isArray(data.notes?.sources) ? data.notes?.sources : [],
          last_updated: data.notes?.last_updated ?? null,
        },
      };
      return cachedIovValues;
    } catch {
      cachedIovValues = DEFAULT_IOV_VALUES;
      return cachedIovValues;
    } finally {
      pendingIovValuesLoad = null;
    }
  })();

  return pendingIovValuesLoad;
};

export const formatIovValue = (value: number | null, units: string) => {
  if (value === null) return "TBD";
  return `${value.toFixed(2)} ${units}`;
};

export const toPositive = (value: number | null) => (value !== null && value > 0 ? value : null);

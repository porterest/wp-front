import React, { createContext, useContext, useState } from "react";
import { PairOption } from "../types/pair";

interface PrefetchedData {
  pairs?: PairOption[];
  time?: number;
}

interface DataPrefetchContextValue {
  data: PrefetchedData;
  setData: React.Dispatch<React.SetStateAction<PrefetchedData>>;
}


const DataPrefetchContext = createContext<DataPrefetchContextValue | undefined>(undefined);

export const DataPrefetchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<PrefetchedData>({});
  return (
    <DataPrefetchContext.Provider value={{ data, setData }}>
      {children}
    </DataPrefetchContext.Provider>
  );
};

export const useDataPrefetch = () => {
  const context = useContext(DataPrefetchContext);
  console.log("Current context value:", context);
  if (!context) {
    throw new Error("useDataPrefetch must be used within a DataPrefetchProvider");
  }
  return context;
};


import { createContext, useContext, useState } from "react";

const BirthContext = createContext({});

export function BirthProvider({ children }) {
  const [birthParams, setBirthParams] = useState({});

  const setBirthParamsDebug = (params) => {
    console.log("[BIRTH CONTEXT] Setting params:", JSON.stringify(params));
    setBirthParams(params);
  };

  return (
    <BirthContext.Provider value={{ birthParams, setBirthParamsDebug, setBirthParams: setBirthParamsDebug }}>
      {children}
    </BirthContext.Provider>
  );
}

export const useBirth = () => useContext(BirthContext);
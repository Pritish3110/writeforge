export interface WriteForgeRuntimeEnvironment {
  hostname: string;
  isBrowser: boolean;
  isLocalhost: boolean;
  isProductionRuntime: boolean;
}

export const getWriteForgeRuntimeEnvironment = (): WriteForgeRuntimeEnvironment => {
  if (typeof window === "undefined") {
    return {
      hostname: "",
      isBrowser: false,
      isLocalhost: false,
      isProductionRuntime: false,
    };
  }

  const hostname = window.location.hostname;
  const isLocalhost =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";

  return {
    hostname,
    isBrowser: true,
    isLocalhost,
    isProductionRuntime: !isLocalhost,
  };
};

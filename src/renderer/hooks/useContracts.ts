import { JsonRpcSigner, Web3Provider } from "@ethersproject/providers"
import { useMemo } from "react";
import { useWeb3Hooks } from "../connectors/hooks";
import MulticallABI from "../abis/Multicall.json";
import { Contract } from '@ethersproject/contracts'
import { ethers } from "ethers";
import { isAddress } from "ethers/lib/utils";
import { useWalletsActiveWallet } from "../state/wallets/hooks";

// account is not optional
export function getSigner(library: Web3Provider, account: string): JsonRpcSigner {
  return library.getSigner(account).connectUnchecked()
}

// account is optional
export function getProviderOrSigner(library: Web3Provider, account?: string): Web3Provider | JsonRpcSigner {
  return account ? getSigner(library, account) : library
}

// account is optional
export function getContract(address: string, ABI: any, library: Web3Provider, account?: string): Contract {
  return new Contract(address, ABI, getProviderOrSigner(library, account) as any)
}

export function useContract(address: string | undefined, ABI: any, withSignerIfPossible = true): Contract | null {
  const { useProvider } = useWeb3Hooks();
  const provider = useProvider();
  const activeWallet = useWalletsActiveWallet();
  return useMemo(() => {
    if (!address || !ABI || !provider) return null
    try {
      return getContract(address, ABI, provider, withSignerIfPossible && activeWallet ? activeWallet.address : undefined)
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [address, ABI, provider, withSignerIfPossible, activeWallet])
}

export function useMulticallContract(): Contract | null | undefined {
  // bsc : 0x1Ee38d535d541c55C9dae27B12edf090C608E6Fb
  // safe4 : 0x0000000000000000000000000000000000001100
  return useContract("0x0000000000000000000000000000000000001100", MulticallABI, false);
}


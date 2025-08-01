import { useMemo } from "react";
import { Contract } from '@ethersproject/contracts'
import { useWalletsActiveWallet } from "../state/wallets/hooks";
import { SysContractABI, SystemContract } from "../constants/SystemContracts";
import { useWeb3React } from "@web3-react/core";
import { IERC20_Interface } from "../abis";
import { Application_Crosschain, Safe4NetworkChainId, SafeswapV2FactoryAddreess, SafeswapV2RouterAddress, WSAFE } from "../config";
import ApplicationContractAbiConfig from "../constants/ApplicationContractAbiConfig";
import { SwapV2FactoryABI, SwapV2RouterABI } from "../constants/SafeswapAbiConfig";


export function useContract(address: string | undefined, ABI: any, withSignerIfPossible = true): Contract | null {
  const { provider } = useWeb3React();
  const activeWallet = useWalletsActiveWallet();
  return useMemo(() => {
    if (!address || !ABI || !provider || !activeWallet) return null
    try {
      return new Contract(
        address, ABI,
        // withSignerIfPossible && signer ? signer : provider
        provider
      )
    } catch (error) {
      console.error('Failed to get contract', error)
      return null
    }
  }, [address, ABI, provider, withSignerIfPossible, activeWallet])
}

export function useMulticallContract(): Contract | null | undefined {
  return useContract(SystemContract.MultiCall, SysContractABI[SystemContract.MultiCall], false);
}

export function useIERC20Contract(address: string, withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(address, IERC20_Interface, withSignerIfPossible);
}

export function useAccountManagerContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.AccountManager, SysContractABI[SystemContract.AccountManager], withSignerIfPossible);
}

export function useSupernodeStorageContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.SuperNodeStorage, SysContractABI[SystemContract.SuperNodeStorage], withSignerIfPossible);
}

export function useSupernodeVoteContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.SNVote, SysContractABI[SystemContract.SNVote], withSignerIfPossible);
}

export function useSupernodeLogicContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.SuperNodeLogic, SysContractABI[SystemContract.SuperNodeLogic], withSignerIfPossible);
}

export function useMasternodeStorageContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.MasterNodeStorage, SysContractABI[SystemContract.MasterNodeStorage], withSignerIfPossible);
}

export function useMasternodeLogicContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.MasterNodeLogic, SysContractABI[SystemContract.MasterNodeLogic], withSignerIfPossible);
}

export function useProposalContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.Proposal, SysContractABI[SystemContract.Proposal], withSignerIfPossible);
}

export function useSafe3Contract(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SystemContract.SAFE3, SysContractABI[SystemContract.SAFE3], withSignerIfPossible);
}

export function useSafeswapV2Router(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SafeswapV2RouterAddress, SwapV2RouterABI, withSignerIfPossible);
}

export function useSafeswapV2Factory(withSignerIfPossible?: boolean): Contract | null | undefined {
  return useContract(SafeswapV2FactoryAddreess, SwapV2FactoryABI, withSignerIfPossible);
}

export function useCrosschainContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  const { chainId } = useWeb3React();
  if (chainId && chainId in Safe4NetworkChainId) {
    return useContract(Application_Crosschain[chainId as Safe4NetworkChainId], ApplicationContractAbiConfig.CrosschainABI, withSignerIfPossible);
  }
  return undefined;
}

export function useWSAFEContract(withSignerIfPossible?: boolean): Contract | null | undefined {
  const { chainId } = useWeb3React();
  if (chainId && chainId in Safe4NetworkChainId) {
    return useContract(WSAFE[chainId as Safe4NetworkChainId].address, ApplicationContractAbiConfig.WSAFEABI, withSignerIfPossible);
  }
  return undefined;
}



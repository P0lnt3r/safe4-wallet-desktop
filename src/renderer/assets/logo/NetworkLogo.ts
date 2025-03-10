

const BSC_NETWORK_PNG = require('./bnb-bnb-logo.png');
const ETH_NETWORK_PNG = require('./ethereum-eth-logo.png');
const MATIC_NETWORK_PNG = require('./polygon-matic-logo.png');
const SOL_NETWORK_PNG = require('./solana-sol-logo.png');
const TRX_NETWORK_PNG = require('./tron-trx-logo.png');

export const BSC_NETWORK_LOGO = BSC_NETWORK_PNG;
export const ETH_NETWORK_LOGO = ETH_NETWORK_PNG;
export const MATIC_NETWORK_LOGO = MATIC_NETWORK_PNG;
export const SOL_NETWORK_LOGO = SOL_NETWORK_PNG;
export const TRX_NETWORK_LOGO = TRX_NETWORK_PNG;


export enum NetworkType {
  BSC = "BNB Smart Chain",
  ETH = "Etherum",
  MATIC = "Ploygon",
  TRX = "TRON",
  SOL = "Solana"
}

export enum NetworkCoinType {
  BSC = "bsc",
  ETH = "eth",
  MATIC = "matic",
  TRX = "trx",
  SOL = "sol",
}

export function outputNetworkCoin(networkType: NetworkType) {
  switch (networkType) {
    case NetworkType.BSC:
      return NetworkCoinType.BSC;
    case NetworkType.ETH:
      return NetworkCoinType.ETH;
    case NetworkType.MATIC:
      return NetworkCoinType.MATIC;
    case NetworkType.TRX:
      return NetworkCoinType.TRX;
    case NetworkType.SOL:
      return NetworkCoinType.SOL;
  }
}

export function getNetworkLogo(networkType: NetworkType) {
  switch (networkType) {
    case NetworkType.BSC:
      return BSC_NETWORK_LOGO;
    case NetworkType.ETH:
      return ETH_NETWORK_LOGO;
    case NetworkType.MATIC:
      return MATIC_NETWORK_LOGO;
    case NetworkType.TRX:
      return TRX_NETWORK_LOGO;
    case NetworkType.SOL:
      return SOL_NETWORK_LOGO;
  }
}

export function getNetworkLogoByCoin(networkType: NetworkCoinType) {
  switch (networkType) {
    case NetworkCoinType.BSC:
      return BSC_NETWORK_LOGO;
    case NetworkCoinType.ETH:
      return ETH_NETWORK_LOGO;
    case NetworkCoinType.MATIC:
      return MATIC_NETWORK_LOGO;
    case NetworkCoinType.TRX:
      return TRX_NETWORK_LOGO;
    case NetworkCoinType.SOL:
      return SOL_NETWORK_LOGO;
  }
}

export function getNetworkNameByCoin(networkType: NetworkCoinType) {
  switch (networkType) {
    case NetworkCoinType.BSC:
      return NetworkType.BSC;
    case NetworkCoinType.ETH:
      return NetworkType.ETH;
    case NetworkCoinType.MATIC:
      return NetworkType.MATIC;
    case NetworkCoinType.TRX:
      return NetworkType.TRX;
    case NetworkCoinType.SOL:
      return NetworkType.SOL;
  }
}


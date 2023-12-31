import { createAction } from "@reduxjs/toolkit";
import { SerializableTransactionReceipt, TokenTransfer } from "./reducer";


export const addTransaction = createAction<{

  hash: string
  from: string,
  to: string,
  value: string,

  approval?: { tokenAddress: string; spender: string }
  summary?: string
  transfer? : TokenTransfer

}>('transactions/addTransaction')

export const clearAllTransactions = createAction<"">('transactions/clearAllTransactions')

export const finalizeTransaction = createAction<{
  hash: string,
  timestamp : number,
  receipt: SerializableTransactionReceipt
}>('transactions/finalizeTransaction')

export const checkedTransaction = createAction<{
  hash: string
  blockNumber: number
}>('transactions/checkedTransaction')

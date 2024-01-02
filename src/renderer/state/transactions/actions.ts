import { createAction } from "@reduxjs/toolkit";
import { SerializableTransactionReceipt } from "./reducer";


export const addTransaction = createAction<{
  hash: string
  from: string
  approval?: { tokenAddress: string; spender: string }
  summary?: string
}>('transactions/addTransaction')

export const clearAllTransactions = createAction<"">('transactions/clearAllTransactions')

export const finalizeTransaction = createAction<{
  hash: string
  receipt: SerializableTransactionReceipt
}>('transactions/finalizeTransaction')

export const checkedTransaction = createAction<{
  hash: string
  blockNumber: number
}>('transactions/checkedTransaction')


import { useMemo, useState } from "react";
import TransactionElementTransfer from "./TransactionElementTransfer";
import TransactionElementCall from "./TransactionElementCall";
import { useWalletsActiveAccount } from "../../../../../state/wallets/hooks";
import { TransactionDetails } from "../../../../../state/transactions/reducer";

export default ({ transaction, setClickTransaction }: {
  transaction: TransactionDetails,
  setClickTransaction: (transaction: TransactionDetails) => void
}) => {

  const activeAccount = useWalletsActiveAccount();
  const ElementRender = useMemo(() => {
    const {
      transfer, call
    } = transaction;
    if (transfer) {
      return <>
        <TransactionElementTransfer transaction={transaction} setClickTransaction={setClickTransaction} />
      </>
    }
    if (call) {
      return <>
        <TransactionElementCall transaction={transaction} setClickTransaction={setClickTransaction} />
      </>
    }
    return <></>
  }, [activeAccount, transaction])

  return <>
    {ElementRender}
  </>
}
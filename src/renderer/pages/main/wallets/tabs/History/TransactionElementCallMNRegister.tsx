
import { Col, Row, Avatar, List, Typography, Modal, Button } from "antd";
import { useMemo } from "react";
import { TransactionDetails } from "../../../../../state/transactions/reducer";
import { DB_AddressActivity_Actions } from "../../../../../../main/handlers/DBAddressActivitySingalHandler";
import AccountManagerSafeDeposit from "./AccountManagerSafeDeposit";
import CallSupernodeRegister from "./CallSupernodeRegister";
import CallMasternodeRegister from "./CallMasternodeRegister";


export default ({ transaction, setClickTransaction, support }: {
  transaction: TransactionDetails,
  setClickTransaction: (transaction: TransactionDetails) => void,
  support: {
    supportFuncName: string,
    inputDecodeResult: any
  }
}) => {
  const {
    status,
    call,
    accountManagerDatas
  } = transaction;
  const { from, to, value, input , isUnion } = useMemo(() => {
    return {
      from: transaction.refFrom,
      to: support.inputDecodeResult._addr,
      value: call?.value,
      input: call?.input,
      isUnion  : support.inputDecodeResult._isUnion
    }
  }, [transaction, call,support]);

  return <>
    <List.Item onClick={() => { setClickTransaction(transaction) }} key={transaction.hash} className="history-element" style={{ paddingLeft: "15px", paddingRight: "15px" }}>
      {
        call && <>
          {/* [as call] */}
          <CallMasternodeRegister from={from} to={to} value={value} status={status} isUnion ={isUnion } />
        </>
      }
    </List.Item>
  </>

}

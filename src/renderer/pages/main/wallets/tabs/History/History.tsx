import { Col, Row, Avatar, List, Typography, Modal, Button, Divider } from "antd";
import TransactionElement from "./TransactionElement";
import { useEffect, useState } from "react";
import TransactionDetailsView from "./TransactionDetailsView";
import { useDispatch, useSelector } from "react-redux";
import { useWalletsActiveAccount } from "../../../../../state/wallets/hooks";
import { useTransactions } from "../../../../../state/transactions/hooks";
import { useBlockNumber } from "../../../../../state/application/hooks";
import { Activity2Transaction, AddressActivityFetch, TransactionDetails } from "../../../../../state/transactions/reducer";
import { DBAddressActivitySignal, DB_AddressActivity_Methods } from "../../../../../../main/handlers/DBAddressActivitySingalHandler";
import { IPC_CHANNEL } from "../../../../../config";
import { reloadTransactionsAndSetAddressActivityFetch } from "../../../../../state/transactions/actions";
import "./index.css"
import { Checkbox } from 'antd';
import type { CheckboxProps } from 'antd';
import { AppState } from "../../../../../state";

const { Text } = Typography;

export default () => {

  const activeAccount = useWalletsActiveAccount();
  const transactions = useTransactions(activeAccount);
  const [clickTransaction, setClickTransaction] = useState<TransactionDetails>();
  const dispatch = useDispatch();
  const latestBlockNumber = useBlockNumber();
  const addressActivityFetch = useSelector<AppState , AddressActivityFetch | undefined>( state => state.transactions.addressActivityFetch );

  useEffect(() => {
    if (activeAccount && activeAccount != addressActivityFetch?.address) {
      console.log("do query db....," ,  activeAccount )
      const method = DB_AddressActivity_Methods.loadActivities;
      window.electron.ipcRenderer.sendMessage(IPC_CHANNEL, [DBAddressActivitySignal, method, [activeAccount]]);
      window.electron.ipcRenderer.once(IPC_CHANNEL, (arg) => {
        if (arg instanceof Array && arg[0] == DBAddressActivitySignal && arg[1] == method) {
          const rows = arg[2][0];
          let dbStoredRange = {
            start: latestBlockNumber,
            end: 1
          };
          const txns = rows.map((row: any) => {
            const { timestamp, block_number } = row;
            if (timestamp) {
              dbStoredRange.start = Math.min(dbStoredRange.start, block_number);
              dbStoredRange.end = Math.max(dbStoredRange.end, block_number);
            }
            return Activity2Transaction(row);
          });
          dispatch(reloadTransactionsAndSetAddressActivityFetch({
            txns,
            addressActivityFetch: {
              address: activeAccount,
              blockNumberStart: dbStoredRange.end,
              blockNumberEnd: latestBlockNumber == 0 ? 99999999 : latestBlockNumber,
              current: 1,
              pageSize: 50,
              status: 0,
              dbStoredRange
            }
          }));
        }
      });
    }
  }, [activeAccount])

  const onChange: CheckboxProps['onChange'] = (e) => {
    setShowSystemReward(e.target.checked);
  };
  const [showSystemReward, setShowSystemReward] = useState<boolean>(false);
  const walletTab = useSelector<AppState , string|undefined>( state => state.application.control.walletTab );
  useEffect( () => {
    const appContainer = document.getElementById("appContainer");
    if (appContainer){
      appContainer.scrollTop = 0;
    }
  } , [walletTab] )

  return <>

    <Checkbox defaultChecked={showSystemReward} onChange={onChange} value={showSystemReward}>显示挖矿奖励</Checkbox>

    <Divider />
    {
      Object.keys(transactions)
        .map(date => {
          return (<div key={date}>
            <Text type="secondary">{date}</Text>
            <br />
            <List
              style={{
                marginTop: "5px", marginBottom: "5px"
              }}
              bordered
              itemLayout="horizontal"
              dataSource={transactions[date]}
              renderItem={(item, index) => {
                if (!showSystemReward && item.systemRewardDatas) {
                  return <></>
                }
                return <TransactionElement setClickTransaction={setClickTransaction} transaction={item} />
              }}
            />
          </div>)
        })
    }

    <Modal title="交易明细" closable footer={null} open={clickTransaction != null} onCancel={() => setClickTransaction(undefined)}>
      <Divider />
      {clickTransaction && <TransactionDetailsView transaction={clickTransaction} />}
    </Modal>

  </>

}

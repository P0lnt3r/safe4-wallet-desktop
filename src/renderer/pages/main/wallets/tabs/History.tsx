import { Col, Row, Avatar, List, Typography, Modal, Button, Divider } from "antd";
import { useTransactions } from "../../../../state/transactions/hooks";
import "./index.css"
import TransactionElement from "./TransactionElement";
import { useCallback, useMemo, useState } from "react";
import { TransactionDetails } from "../../../../state/transactions/reducer";
import { useWalletsActiveAccount } from "../../../../state/wallets/hooks";
import TransactionDetailsView from "./TransactionDetailsView";

const { Text } = Typography;

export default () => {

  const activeAccount = useWalletsActiveAccount();
  const transactions = useTransactions(activeAccount);
  const [clickTransaction, setClickTransaction] = useState<TransactionDetails>();

  return <>

    <Modal title="交易明细" closable footer={null} open={clickTransaction != null} onCancel={() => setClickTransaction(undefined)}>
      <Divider />
      {clickTransaction && <TransactionDetailsView transaction={clickTransaction} />}
    </Modal>
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
              renderItem={(item, index) => (
                <TransactionElement setClickTransaction={setClickTransaction} transaction={item} />
              )}
            />
          </div>)
        })
    }

  </>

}

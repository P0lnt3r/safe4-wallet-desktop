import { Row, Alert, Col, Tag, Typography, Divider, Card, Spin, Button, Tooltip } from "antd"
import { LoadingOutlined, CheckCircleFilled, CloseCircleFilled, ExportOutlined, GlobalOutlined } from '@ant-design/icons';
import TokenLogo from "../../../../components/TokenLogo";
import { TransactionDetails } from "../../../../../state/transactions/reducer";
import { useWalletsActiveAccount } from "../../../../../state/wallets/hooks";
import EtherAmount from "../../../../../utils/EtherAmount";
import AddressView from "../../../../components/AddressView";
import { DateTimeFormat } from "../../../../../utils/DateUtils";
import { useTransaction } from "../../../../../state/transactions/hooks";
import { useMemo } from "react";
import config from "../../../../../config";
import Safescan from "../../../../components/Safescan";

const { Safescan_URL } = config;
const { Text } = Typography;

export default ({
  transaction
}: {
  transaction: TransactionDetails
}) => {
  const tx = useTransaction(transaction.hash);
  const {
    hash,
    status,
    receipt,
    transfer,
    timestamp,
    addedTime
  } = useMemo(() => {
    if (tx && tx.hash) {
      return tx;
    }
    return {
      hash: undefined,
      status: undefined,
      receipt: undefined,
      transfer: undefined,
      timestamp: undefined,
      addedTime: undefined
    }
  }, [tx])
  const activeAccount = useWalletsActiveAccount();

  return <>

    <Row>
      <Col span={24}>
        {
          status == 1 && <>
            <CheckCircleFilled style={{
              color: "#52c41a", fontSize: "50px", float: "left", marginRight: "20px", marginLeft: "20px"
            }} />
            <div>
              <Text style={{ fontSize: "16px" }}>成功</Text><br />
              <Text style={{ fontSize: "16px" }} type="secondary">{DateTimeFormat(addedTime)}</Text>
            </div>
          </>
        }
        {
          status == undefined && <>
            <Spin style={{ float: "left" }} indicator={
              <LoadingOutlined style={{ fontSize: "50px", marginRight: "20px", marginLeft: "20px" }}
              />} >
            </Spin>
            <div>
              <Text style={{ fontSize: "16px" }}>等待</Text><br />
              <Text style={{ fontSize: "16px" }} type="secondary">{addedTime && DateTimeFormat(addedTime)}</Text>
            </div>
          </>
        }
        {
          status == 0 && <>
            <CloseCircleFilled style={{
              color: "#e53d3d", fontSize: "50px", float: "left", marginRight: "20px", marginLeft: "20px"
            }} />
            <div>
              <Text style={{ fontSize: "16px" }}>失败</Text><br />
              <Text style={{ fontSize: "16px" }} type="secondary">{DateTimeFormat(addedTime)}</Text>
            </div>
          </>
        }
      </Col>
    </Row>

    <Divider />

    <Text type="secondary" style={{ fontSize: "12px" }}>详情</Text><br />
    <Card style={{ marginTop: "8px" }}>
      <Row>
        <Col span={12}>
          <Text type="secondary">交易哈希</Text>
        </Col>
        <Col span={12} style={{textAlign:"right"}}>
          <Safescan url={`/tx/${hash}`} />
        </Col>
        <Col span={24} style={{marginTop:"5px"}}>
          <Text>{hash}</Text>
        </Col>
      </Row>
      <Divider style={{ marginTop: "10px", marginBottom: "10px" }} />
    </Card>
    <br />
    {
      /** transfer 交易 */
      transfer && <>
        <Text type="secondary" style={{ fontSize: "12px" }}>交易</Text><br />
        <Card title={<>
          <TokenLogo />
          <Text strong style={{ fontSize: "16px", lineHeight: "32px", marginLeft: "10px" }}>
            {
              activeAccount == transfer.from && <>发送</>
            }
            {
              activeAccount == transfer.to && <>接收</>
            }
          </Text>
        </>} style={{ marginTop: "8px" }}>
          {
            activeAccount == transfer.from && <>
              <Text style={{ fontSize: "28px" }} strong>-{EtherAmount({ raw: transfer.value })} SAFE</Text>
            </>
          }
          {
            activeAccount == transfer.to && <>
              <Text style={{ fontSize: "28px", color: "green" }} strong>+{EtherAmount({ raw: transfer.value })} SAFE</Text>
            </>
          }
          <br /><br />

          <Text type="secondary">从</Text><br />
          <div style={{ marginLeft: "5px" }}><AddressView address={transfer.from} /></div><br />

          <Text type="secondary">到</Text><br />
          <div style={{ marginLeft: "5px" }}><AddressView address={transfer.to} /></div><br />
        </Card>
      </>
    }

  </>

}

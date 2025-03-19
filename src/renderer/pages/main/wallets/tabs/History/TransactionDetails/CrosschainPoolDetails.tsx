import { Avatar, Button, Card, Col, Row, Tooltip, Typography } from "antd"
import { TransactionDetails } from "../../../../../../state/transactions/reducer"
import TokenLogo from "../../../../../components/TokenLogo";
import { useWalletsActiveAccount } from "../../../../../../state/wallets/hooks";
import AddressComponent from "../../../../../components/AddressComponent";
import { CrosschainDirection, getCrosschainDirection } from "../TransactionElementCallCrosschainPool";
import { getNetworkExplorerURLByCoin, getNetworkExplorerURLByTxPrefix, getNetworkLogoByCoin, getNetworkLogoByTxIDPrefix, getNetworkNameByCoin, getNetworkNameByTxPrefix, NetworkCoinType, NetworkTxIdPrefix } from "../../../../../../assets/logo/NetworkLogo";
import { ethers } from "ethers";
import { GlobalOutlined, SyncOutlined } from "@ant-design/icons";
import EtherAmount from "../../../../../../utils/EtherAmount";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCrosschain } from "../../../../../../state/transactions/hooks";

const { Text } = Typography;

export default ({
  support, transaction
}: {
  support: {
    supportFuncName: string,
    inputDecodeResult: any
  },
  transaction: TransactionDetails
}) => {
  const {
    call,
    hash
  } = transaction;
  const activeAccount = useWalletsActiveAccount();
  const crosschainDirection = getCrosschainDirection(support.supportFuncName);
  const crosschainData = useCrosschain(hash);
  const crosschainSpin = useMemo(() => {
    if (crosschainDirection) {
      if (crosschainDirection == CrosschainDirection.SAFE4_NETWORKS) {
        return !(crosschainData && crosschainData.status == 4)
      } else if (crosschainDirection == CrosschainDirection.NETWORKS_SAFE4) {
        return false;
      }
    }
  }, [crosschainData]);

  const RenderCrosschainStatus = useCallback(() => {
    if (crosschainData && crosschainData.status == 4) {
      return <Text type="success" strong>已完成</Text>
    }
    return <Text strong type="secondary" italic>等待确认</Text>
  }, [crosschainData])

  return <>
    <Row>
      <Text type="secondary">跨链</Text>
    </Row>
    <Card>
      {/* <Text>{JSON.stringify(support)}</Text> */}
      <Row>
        <Col span={24}>
          <Text type="secondary">资产</Text>
        </Col>
        <Col span={24}>
          {
            crosschainSpin && <SyncOutlined spin={crosschainSpin} style={{ fontSize: "28px" }} />
          }
          <Text style={{ fontSize: "28px", marginLeft: "5px" }} strong>
            {
              call?.value && <>
                <EtherAmount raw={call?.value} /> SAFE
              </>
            }
          </Text>
        </Col>
      </Row>

      {
        crosschainDirection == CrosschainDirection.NETWORKS_SAFE4 && support.inputDecodeResult &&
        <Row style={{ marginTop: "15px" }}>
          <Col span={4}>
            <Text type="secondary">跨链发起</Text>
          </Col>
          <Col span={20}>
            <Text style={{ float: "right" }}>
              <Tooltip title="在浏览器上查看">
                <Button size="small" icon={<GlobalOutlined onClick={() => window.open(`${getNetworkExplorerURLByTxPrefix(support.supportFuncName as NetworkTxIdPrefix)}/tx/${support.inputDecodeResult}`)} />} />
              </Tooltip>
            </Text>
          </Col>
          <Col>
            <Text>{support.inputDecodeResult}</Text>
          </Col>
        </Row>
      }

      <Row>
        <Col span={24}>
          <Text type="secondary">从</Text>
        </Col>
        {
          crosschainDirection == CrosschainDirection.SAFE4_NETWORKS &&
          <>
            <Col span={2} style={{ paddingTop: "8px" }}>
              <TokenLogo width="30px" height="30px" />
            </Col>
            <Col span={22}>
              <Text strong>Safe4 网络</Text>
              <br />
              <AddressComponent address={activeAccount} />
            </Col>
          </>
        }
        {
          crosschainDirection == CrosschainDirection.NETWORKS_SAFE4 &&
          <>
            <Col span={2} style={{ paddingTop: "8px" }}>
              <Avatar src={getNetworkLogoByTxIDPrefix(support.supportFuncName as NetworkTxIdPrefix)} />
            </Col>
            <Col span={22}>
              <Text strong>{getNetworkNameByTxPrefix(support.supportFuncName as NetworkTxIdPrefix)}</Text>
              <br />
              {
                crosschainData && crosschainData.srcAddress && ethers.utils.isAddress(crosschainData.srcAddress) &&
                <AddressComponent address={crosschainData.srcAddress} />
              }
            </Col>
          </>
        }
      </Row>
      <Row style={{ marginTop: "10px" }}>
        <Col span={24}>
          <Text type="secondary">跨链到</Text>
        </Col>
        {
          crosschainDirection == CrosschainDirection.SAFE4_NETWORKS &&
          <>
            <Col span={2} style={{ paddingTop: "8px" }}>
              <Avatar src={getNetworkLogoByCoin(support.supportFuncName as NetworkCoinType)} />
            </Col>
            <Col span={22}>
              <Text strong>{getNetworkNameByCoin(support.supportFuncName as NetworkCoinType)} 网络</Text>
              <br />
              {
                support.inputDecodeResult && ethers.utils.isAddress(support.inputDecodeResult)
                && <AddressComponent address={support.inputDecodeResult} />
              }
            </Col>
          </>
        }
        {
          crosschainDirection == CrosschainDirection.NETWORKS_SAFE4 &&
          <>
            <Col span={2} style={{ paddingTop: "8px" }}>
              <TokenLogo />
            </Col>
            <Col span={22}>
              <Text strong>Safe4 网络</Text>
              <br />
              {
                call?.to && <AddressComponent address={call?.to} />
              }
            </Col>
          </>
        }
      </Row>

      {
        crosschainDirection == CrosschainDirection.SAFE4_NETWORKS && crosschainData && crosschainData.dstTxHash &&
        <Row style={{ marginTop: "15px" }}>
          <Col span={4}>
            <Text type="secondary">跨链确认</Text>
          </Col>
          <Col span={20}>
            <Text style={{ float: "right" }}>
              <Tooltip title="在浏览器上查看">
                <Button size="small" icon={<GlobalOutlined onClick={() => window.open(`${getNetworkExplorerURLByCoin(crosschainData.dstNetwork as NetworkCoinType)}/tx/${crosschainData.dstTxHash}`)} />} />
              </Tooltip>
            </Text>
          </Col>
          <Col>
            <Text>{crosschainData.dstTxHash}</Text>
          </Col>
        </Row>
      }

      <Row style={{ marginTop: "10px" }}>
        <Col span={8}>
          <Text type="secondary">跨链状态</Text><br />
          {
            RenderCrosschainStatus()
          }
        </Col>
        {
          crosschainData && crosschainData.status == 4 && <>
            <Col span={8}>
              <Text type="secondary">到账数量</Text><br />
              <Text strong>
                {
                  crosschainData?.dstAmount
                } SAFE
              </Text>
            </Col>
            <Col span={8}>
              <Text type="secondary">手续费</Text><br />
              <Text strong>
                {
                  crosschainData?.fee
                } SAFE
              </Text>
            </Col>
          </>
        }
      </Row>
    </Card>
  </>
}
